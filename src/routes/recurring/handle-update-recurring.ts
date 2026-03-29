/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for updating a recurring expense.
 * @module routes/recurring/handleUpdateRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, MESSAGES } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { validateRequest, RecurringExpenseFormSchema } from '../../lib/validators'
import {
  updateRecurringExpense,
  createCategory,
  getCategoryByName,
} from '../../lib/expense-db-access'

const RECURRING_UPDATED = 'Recurring expense updated successfully.'

const parseCents = (amount: string): number => {
  const parsed = parseFloat(amount.trim())
  return Math.round(parsed * 100)
}

const resolveCategory = async (
  db: DrizzleClient,
  categoryId: string | undefined,
  newCategoryName: string | undefined,
): Promise<string | null> => {
  if (newCategoryName && newCategoryName.trim()) {
    const name = newCategoryName.trim()
    const existing = await getCategoryByName(db, name)
    if (existing.isOk && existing.value.length > 0) {
      return existing.value[0].id
    }
    const created = await createCategory(db, name)
    if (created.isOk) {
      return created.value.id
    }
    return null
  }
  if (categoryId && categoryId.trim()) {
    return categoryId.trim()
  }
  return null
}

/**
 * Attach the update recurring expense handler to the app.
 */
export const handleUpdateRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.RECURRING.EDIT,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const id = c.req.param('id') ?? ''
        const db = c.get('db') as DrizzleClient
        const editPath = PATHS.RECURRING.EDIT.replace(':id', id)

        const body = await c.req.parseBody()
        const [ok, data, err] = validateRequest(body, RecurringExpenseFormSchema)

        if (!ok) {
          const commaSpot = err?.indexOf(',') ?? -1
          const errorMsg =
            commaSpot > -1 ? err!.substring(0, commaSpot) : (err ?? MESSAGES.INVALID_INPUT)
          return redirectWithError(c, editPath, errorMsg)
        }

        const { amount, description, period, nextRunDate, categoryId, newCategory } = data as {
          amount: string
          description: string
          period: string
          nextRunDate: string
          categoryId?: string
          newCategory?: string
        }

        const amountCents = parseCents(amount)
        const resolvedCategoryId = await resolveCategory(db, categoryId, newCategory)

        const result = await updateRecurringExpense(db, id, {
          amountCents,
          description: description.trim(),
          categoryId: resolvedCategoryId,
          period: period.trim(),
          nextRunDate: nextRunDate.trim(),
        })

        if (result.isErr) {
          console.error('Update recurring expense error:', result.error)
          return redirectWithError(c, editPath, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
        }

        if (!result.value) {
          return redirectWithError(c, editPath, 'Recurring expense not found.')
        }

        return redirectWithMessage(c, PATHS.RECURRING.LIST, RECURRING_UPDATED)
      } catch (error) {
        console.error('Update recurring expense handler error:', error)
        return redirectWithError(c, PATHS.RECURRING.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
      }
    },
  )
}
