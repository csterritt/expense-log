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
import { listTags } from '../../lib/db/tag-access'
import { createExpenseWithTags } from '../../lib/db/expense-access'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import { parseExpenseCreate, parseNewCategoryName, parseTagInputs } from '../../lib/expense-validators'
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

  const validated = parseExpenseCreate({
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
  })

  if (validated.isErr) {
    const rawValues: ExpenseFormValues = {
      description: raw.description,
      amount: raw.amount,
      date: raw.date,
      category: raw.category,
      tagIds: raw.tagId,
      newTags: raw.newTags,
    }
    return redirectWithFormErrors(c, PATHS.EXPENSES, validated.error, rawValues)
  }

  const db = createDbClient(c.env.PROJECT_DB)

  const allTagsResult = await listTags(db)
  if (allTagsResult.isErr) {
    return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
  }

  const tagInputParse = parseTagInputs(
    { tagId: raw.tagId, newTags: raw.newTags },
    allTagsResult.value,
  )
  if (Object.keys(tagInputParse.fieldErrors).length > 0) {
    const rawValues: ExpenseFormValues = {
      description: raw.description,
      amount: raw.amount,
      date: raw.date,
      category: raw.category,
      tagIds: raw.tagId,
      newTags: tagInputParse.rawNewTagsPreserved,
    }
    return redirectWithFormErrors(c, PATHS.EXPENSES, tagInputParse.fieldErrors, rawValues)
  }

  const resolvedIdSet = new Set(allTagsResult.value.map((t) => t.id))
  const unknownIds = tagInputParse.lookupCandidateTagIds.filter((id) => !resolvedIdSet.has(id))
  if (unknownIds.length > 0) {
    const rawValues: ExpenseFormValues = {
      description: raw.description,
      amount: raw.amount,
      date: raw.date,
      category: raw.category,
      tagIds: raw.tagId,
      newTags: raw.newTags,
    }
    return redirectWithFormErrors(c, PATHS.EXPENSES, { tags: 'One or more selected tags no longer exist.' }, rawValues)
  }

  const lookup = await findCategoryByName(db, validated.value.category)
  if (lookup.isErr) {
    return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
  }

  const existingTagIds = tagInputParse.tagIds
  const newTagNames = tagInputParse.newTags

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
      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
        tagIds: raw.tagId,
        newTags: raw.newTags,
      }
      return redirectWithFormErrors(c, PATHS.EXPENSES, { category: nameCheck.error }, rawValues)
    }
    normalizedNewCategory = nameCheck.value.toLowerCase()
    finalCategoryName = normalizedNewCategory
  } else {
    finalCategoryName = lookup.value!.name
  }

  // Look up names for already-existing selected tags from the already-fetched tag list.
  const allTagsById = new Map(allTagsResult.value.map((t) => [t.id, t.name]))
  const existingTagNames = existingTagIds.map((id) => allTagsById.get(id) ?? '').filter(Boolean)

  // Render the consolidated confirmation page. No DB writes yet.
  const sortedNewTags = newTagNames.slice().sort((a, b) => a.localeCompare(b))
  const allTagNames = [...existingTagNames, ...newTagNames]
  const finalTagNames = allTagNames.slice().sort((a, b) => a.localeCompare(b))

  const confirmValues: ExpenseFormValues = {
    description: raw.description,
    amount: raw.amount,
    date: raw.date,
    category: raw.category,
    tagIds: existingTagIds,
    newTags: newTagNames.join(','),
  }

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
        values: confirmValues,
      }),
    ),
  )
}
