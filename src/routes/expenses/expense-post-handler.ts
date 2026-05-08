/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * POST handler for expense creation.
 * @module routes/expenses/expense-post-handler
 */

import { Context } from 'hono'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { findCategoryByName } from '../../lib/db/category-access'
import { findTagsByNames } from '../../lib/db/tag-access'
import { createExpenseWithTags } from '../../lib/db/expense-access'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import { parseExpenseCreate, parseNewCategoryName, parseTagCsv, type FieldErrors } from '../../lib/expense-validators'
import { redirectWithFormErrors, type ExpenseFormValues } from '../../lib/form-state'
import { readRawBody } from './expense-form-helpers'
import { renderConfirmNewItems } from './expense-form'
import { PATHS } from '../../constants'

const CONFIRM_CREATE_NEW_PATH = '/expenses/confirm-create-new'

/**
 * Handles POST requests to create a new expense.
 *
 * @param c - The Hono context
 * @returns A redirect response or the confirmation page
 */
export const handleExpensesPost = async (c: Context<{ Bindings: Bindings }>) => {
  const raw = await readRawBody(c)
  const rawValues: ExpenseFormValues = {
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
    tags: raw.tags,
  }

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

  const categoryIsNew = lookup.value === null
  const anyNew = categoryIsNew || newTagNames.length > 0

  if (!anyNew) {
    // Everything matches — create the expense (and link tags) directly.
    const createResult = await createExpenseWithTags(db, {
      description: validated.value.description,
      amountCents: validated.value.amountCents,
      date: validated.value.date,
      categoryId: lookup.value!.id,
      tagIds: existingTagIds,
    })
    if (createResult.isErr) {
      return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
    }
    return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
  }

  // Something is new — validate the new-category name when applicable.
  let normalizedNewCategory: string | null = null
  let finalCategoryName: string
  if (categoryIsNew) {
    const nameCheck = parseNewCategoryName(validated.value.category)
    if (nameCheck.isErr) {
      return redirectWithFormErrors(c, PATHS.EXPENSES, { category: nameCheck.error }, rawValues)
    }
    normalizedNewCategory = nameCheck.value.toLowerCase()
    finalCategoryName = normalizedNewCategory
  } else {
    finalCategoryName = lookup.value!.name
  }

  // Render the consolidated confirmation page. No DB writes yet.
  const sortedNewTags = newTagNames.slice().sort((a, b) => a.localeCompare(b))
  const finalTagNames = tagParse.value.slice().sort((a, b) => a.localeCompare(b))
  return c.render(
    useLayout(
      c,
      renderConfirmNewItems({
        mode: 'create',
        action: CONFIRM_CREATE_NEW_PATH,
        newCategoryName: normalizedNewCategory,
        finalCategoryName,
        newTagNames: sortedNewTags,
        finalTagNames,
        values: rawValues,
      }),
    ),
  )
}
