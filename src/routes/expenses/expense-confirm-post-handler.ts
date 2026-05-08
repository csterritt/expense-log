/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * POST handler for expense creation confirmation.
 * @module routes/expenses/expense-confirm-post-handler
 */

import { Context } from 'hono'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { findCategoryByName } from '../../lib/db/category-access'
import { findTagsByNames } from '../../lib/db/tag-access'
import { createManyAndExpense } from '../../lib/db/expense-access'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import { parseExpenseCreate, parseNewCategoryName, parseTagCsv, type FieldErrors } from '../../lib/expense-validators'
import { redirectWithFormErrors, type ExpenseFormValues } from '../../lib/form-state'
import { readRawBody } from './expense-form-helpers'
import { PATHS } from '../../constants'

/**
 * Handles POST requests to confirm and create a new expense with new categories/tags.
 *
 * @param c - The Hono context
 * @returns A redirect response
 */
export const handleExpensesConfirmPost = async (c: Context<{ Bindings: Bindings }>) => {
  const raw = await readRawBody(c)
  const rawValues: ExpenseFormValues = {
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
    tags: raw.tags,
  }

  if (raw.action === 'cancel') {
    // Round-trip every typed value back to the entry form via the
    // single-use form-state cookie, with no field errors.
    return redirectWithFormErrors(c, PATHS.EXPENSES, {}, rawValues)
  }

  // Defensive re-validation of every field — the user could have
  // tampered with hidden inputs.
  const validated = parseExpenseCreate({
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
  })
  const tagParse = parseTagCsv(raw.tags)
  if (validated.isErr || tagParse.isErr) {
    const errs: FieldErrors = validated.isErr ? { ...validated.error } : {}
    if (tagParse.isErr) {
      errs.tags = tagParse.error
    }
    return redirectWithFormErrors(c, PATHS.EXPENSES, errs, rawValues)
  }

  const db = createDbClient(c.env.PROJECT_DB)
  const lookup = await findCategoryByName(db, validated.value.category)
  if (lookup.isErr) {
    return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
  }
  const tagLookup = await findTagsByNames(db, tagParse.value)
  if (tagLookup.isErr) {
    return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
  }
  const existingTagByLower = new Map<string, { id: string; name: string }>()
  for (const row of tagLookup.value) {
    existingTagByLower.set(row.name.toLowerCase(), row)
  }
  const newTagNames: string[] = []
  const existingTagIds: string[] = []
  for (const lowered of tagParse.value) {
    const match = existingTagByLower.get(lowered)
    if (match) {
      existingTagIds.push(match.id)
    } else {
      newTagNames.push(lowered)
    }
  }

  let newCategoryName: string | null = null
  let existingCategoryId: string | null = null
  if (lookup.value !== null) {
    existingCategoryId = lookup.value.id
  } else {
    const nameCheck = parseNewCategoryName(validated.value.category)
    if (nameCheck.isErr) {
      return redirectWithFormErrors(c, PATHS.EXPENSES, { category: nameCheck.error }, rawValues)
    }
    newCategoryName = nameCheck.value
  }

  const createResult = await createManyAndExpense(db, {
    newCategoryName,
    existingCategoryId,
    newTagNames,
    existingTagIds,
    date: validated.value.date,
    description: validated.value.description,
    amountCents: validated.value.amountCents,
  })
  if (createResult.isErr) {
    // Surface the collision message under whichever field is most likely
    // to be at fault. We can't tell deterministically, so use `category`
    // when a new category was being created and `tags` otherwise.
    const errs: FieldErrors =
      newCategoryName !== null
        ? { category: createResult.error.message }
        : { tags: createResult.error.message }
    return redirectWithFormErrors(c, PATHS.EXPENSES, errs, rawValues)
  }

  return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
}
