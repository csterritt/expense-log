/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for creating a new expense.
 * @module routes/expenses/handleCreateExpense
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, EXPENSE_MESSAGES, MESSAGES } from '../../constants'
import type { Bindings, AuthUser, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { validateRequest, ExpenseFormSchema } from '../../lib/validators'
import {
  createExpense,
  createCategory,
  getCategoryByName,
  createTag,
  getTagByName,
  setExpenseTags,
} from '../../lib/expense-db-access'

/**
 * Parse dollar amount string to cents integer
 * e.g. "12.50" -> 1250
 */
const parseCents = (amount: string): number => {
  const parsed = parseFloat(amount.trim())
  return Math.round(parsed * 100)
}

/**
 * Resolve or create a category by name, return its id or null
 */
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
 * Resolve or create tags from comma-separated string, return array of ids
 */
const resolveTags = async (
  db: DrizzleClient,
  newTagsStr: string | undefined,
): Promise<string[]> => {
  if (!newTagsStr || !newTagsStr.trim()) {
    return []
  }
  const names = newTagsStr
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const ids: string[] = []
  for (const name of names) {
    const existing = await getTagByName(db, name)
    if (existing.isOk && existing.value.length > 0) {
      ids.push(existing.value[0].id)
    } else {
      const created = await createTag(db, name)
      if (created.isOk) {
        ids.push(created.value.id)
      }
    }
  }
  return ids
}

/**
 * Attach the create expense handler to the app.
 */
export const handleCreateExpense = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.EXPENSES.LIST,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const user = c.get('user') as AuthUser
        const db = c.get('db') as DrizzleClient

        const body = await c.req.parseBody()
        const [ok, data, err] = validateRequest(body, ExpenseFormSchema)

        if (!ok) {
          const commaSpot = err?.indexOf(',') ?? -1
          const errorMsg =
            commaSpot > -1 ? err!.substring(0, commaSpot) : (err ?? MESSAGES.INVALID_INPUT)
          return redirectWithError(c, PATHS.EXPENSES.LIST, errorMsg)
        }

        const { amount, date, description, categoryId, newCategory, newTags } = data as {
          amount: string
          date: string
          description: string
          categoryId?: string
          newCategory?: string
          newTags?: string
        }

        const amountCents = parseCents(amount)
        const resolvedCategoryId = await resolveCategory(db, categoryId, newCategory)
        const tagIds = await resolveTags(db, newTags)

        const expenseResult = await createExpense(db, {
          userId: user.id,
          amountCents,
          date: date.trim(),
          description: description.trim(),
          categoryId: resolvedCategoryId,
        })

        if (expenseResult.isErr) {
          console.error('Create expense error:', expenseResult.error)
          return redirectWithError(c, PATHS.EXPENSES.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
        }

        if (tagIds.length > 0) {
          await setExpenseTags(db, expenseResult.value.id, tagIds)
        }

        return redirectWithMessage(c, PATHS.EXPENSES.LIST, EXPENSE_MESSAGES.EXPENSE_CREATED)
      } catch (error) {
        console.error('Create expense handler error:', error)
        return redirectWithError(c, PATHS.EXPENSES.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
      }
    },
  )
}
