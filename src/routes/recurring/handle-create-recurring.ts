/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for creating a new recurring expense.
 * @module routes/recurring/handleCreateRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, MESSAGES } from '../../constants'
import type { Bindings, AuthUser, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { validateRequest, RecurringExpenseFormSchema } from '../../lib/validators'
import {
  createRecurringExpense,
  createCategory,
  getCategoryByName,
} from '../../lib/expense-db-access'

const RECURRING_CREATED = 'Recurring expense created successfully.'

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
 * Attach the create recurring expense handler to the app.
 */
export const handleCreateRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.RECURRING.LIST,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const user = c.get('user') as AuthUser
        const db = c.get('db') as DrizzleClient

        const body = await c.req.parseBody()
        const [ok, data, err] = validateRequest(body, RecurringExpenseFormSchema)

        if (!ok) {
          const commaSpot = err?.indexOf(',') ?? -1
          const errorMsg =
            commaSpot > -1 ? err!.substring(0, commaSpot) : (err ?? MESSAGES.INVALID_INPUT)
          return redirectWithError(c, PATHS.RECURRING.LIST, errorMsg)
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

        const result = await createRecurringExpense(db, {
          userId: user.id,
          amountCents,
          description: description.trim(),
          categoryId: resolvedCategoryId,
          period: period.trim(),
          nextRunDate: nextRunDate.trim(),
          isActive: true,
        })

        if (result.isErr) {
          console.error('Create recurring expense error:', result.error)
          return redirectWithError(c, PATHS.RECURRING.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
        }

        return redirectWithMessage(c, PATHS.RECURRING.LIST, RECURRING_CREATED)
      } catch (error) {
        console.error('Create recurring expense handler error:', error)
        return redirectWithError(c, PATHS.RECURRING.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
      }
    },
  )
}
