/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * POST handler for expense creation confirmation.
 * @module routes/expenses/expense-confirm-post-handler
 */

import { Context } from 'hono'
import { Result } from 'true-myth'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { createManyAndExpense } from '../../lib/db/expense-access'
import { withIdempotency } from '../../lib/submission-idempotency'
import { resolveConfirmTagsAndCategory } from '../../lib/db/confirm-helpers'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import { parseExpenseCreate, type FieldErrors } from '../../lib/expense-validators'
import { redirectWithFormErrors, type ExpenseFormValues } from '../../lib/form-state'
import { readRawBody, requireUserId, EXPENSE_ADDED_OUTCOME } from './expense-form-helpers'
import { PATHS } from '../../constants'

/**
 * Handles POST requests to confirm and create a new expense with new categories/tags.
 *
 * @param c - The Hono context
 * @returns A redirect response
 */
export const handleExpensesConfirmPost = async (c: Context<{ Bindings: Bindings }>) => {
  const raw = await readRawBody(c)

  if (raw.action === 'cancel') {
    const cancelValues: ExpenseFormValues = {
      description: raw.description,
      amount: raw.amount,
      date: raw.date,
      category: raw.category,
      tagIds: raw.tagId,
      newTags: raw.newTags,
    }
    return redirectWithFormErrors(c, PATHS.EXPENSES, {}, cancelValues)
  }

  const rawValues: ExpenseFormValues = {
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
    tagIds: raw.tagId,
    newTags: raw.newTags,
  }

  // Defensive re-validation of every field — the user could have
  // tampered with hidden inputs.
  const validated = parseExpenseCreate({
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
  })
  if (validated.isErr) {
    return redirectWithFormErrors(c, PATHS.EXPENSES, validated.error, rawValues)
  }

  const db = createDbClient(c.env.PROJECT_DB)
  const resolved = await resolveConfirmTagsAndCategory(
    db,
    raw.tagId,
    raw.newTags,
    validated.value.category,
  )
  if (!resolved.ok) {
    if (resolved.kind === 'tag-list-error') {
      return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
    }
    if (resolved.kind === 'tag-input-error') {
      return redirectWithFormErrors(c, PATHS.EXPENSES, resolved.fieldErrors, rawValues)
    }
    if (resolved.kind === 'category-lookup-error') {
      return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
    }
    if (resolved.kind === 'new-category-name-error') {
      return redirectWithFormErrors(c, PATHS.EXPENSES, { category: resolved.message }, rawValues)
    }
  }

  const { existingTagIds, newTagNames, existingCategoryId, newCategoryName } = resolved as Extract<
    typeof resolved,
    { ok: true }
  >

  // Route the commit through the idempotency ledger so a replayed confirm
  // POST carrying the same submissionKey reproduces the redirect without a
  // second write.
  const outcome = await withIdempotency(db, {
    key: raw.submissionKey,
    userId: requireUserId(c),
    run: async () => {
      const createResult = await createManyAndExpense(db, {
        newCategoryName: newCategoryName ?? null,
        existingCategoryId: existingCategoryId ?? null,
        newTagNames,
        existingTagIds,
        date: validated.value.date,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
      })
      if (createResult.isErr) {
        return Result.err(createResult.error)
      }
      return Result.ok(EXPENSE_ADDED_OUTCOME)
    },
  })
  if (outcome.isErr) {
    const errs: FieldErrors =
      newCategoryName !== null
        ? { category: outcome.error.message }
        : { tags: outcome.error.message }
    return redirectWithFormErrors(c, PATHS.EXPENSES, errs, rawValues)
  }

  return redirectWithMessage(c, outcome.value.path, outcome.value.message)
}
