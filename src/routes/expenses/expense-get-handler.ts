/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * GET handler for the expenses list page.
 * @module routes/expenses/expense-get-handler
 */

import { Context } from 'hono'
import { html } from 'hono/html'
import { ulid } from 'ulid'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { defaultRangeEt, todayEt } from '../../lib/et-date'
import { listExpenses } from '../../lib/db/expense-access'
import { listCategories } from '../../lib/db/category-access'
import { listTags } from '../../lib/db/tag-access'
import { parseExpenseListFilters } from '../../lib/expense-validators'
import { readAndClearFormState } from '../../lib/form-state'
import { renderExpenses } from './expense-list-renderer'
import { emptyState } from './expense-form-helpers'
import { HTML_STATUS } from '../../constants'
import type { ExpenseFormPayloads, ExpenseFormState } from './expense-form'

/**
 * Render a terminal expense-list load error without redirecting the user.
 */
export const renderExpenseLoadError = (c: Context<{ Bindings: Bindings }>): Response => {
  c.status(HTML_STATUS.INTERNAL_SERVER_ERROR)
  return c.render(
    useLayout(
      c,
      html`<div role="alert" data-testid="expenses-load-error">
        Failed to load expenses. Please try again.
      </div>`,
    ),
  )
}

/**
 * Handles GET requests to the expenses list page.
 *
 * @param c - The Hono context
 * @returns The rendered expenses page or a redirect response
 */
export const handleExpensesGet = async (c: Context<{ Bindings: Bindings }>) => {
  const db = createDbClient(c.env.PROJECT_DB)

  const rawQ = c.req.query()
  const rawTagId = c.req.queries('tagId')
  const rawFilters = {
    description: rawQ['description'],
    from: rawQ['from'],
    to: rawQ['to'],
    categoryId: rawQ['categoryId'],
    tagId: rawTagId !== undefined && rawTagId.length > 0 ? rawTagId : rawQ['tagId'],
    tagMode: rawQ['tagMode'],
  }
  const {
    hasFilterParams,
    filters,
    fieldErrors: filterErrors,
  } = parseExpenseListFilters(rawFilters)

  const activeFilters = hasFilterParams
    ? filters
    : { ...defaultRangeEt(), tagIds: [], tagMode: 'or' as const }

  const tagsResult = await listTags(db)
  if (tagsResult.isErr) {
    return renderExpenseLoadError(c)
  }
  const allTagIds = new Set(tagsResult.value.map((row) => row.id))
  const resolvedTagIds = activeFilters.tagIds.filter((id) => allTagIds.has(id))
  const resolvedFilters = { ...activeFilters, tagIds: resolvedTagIds }

  const expensesResult = await listExpenses(db, resolvedFilters)
  if (expensesResult.isErr) {
    return renderExpenseLoadError(c)
  }
  const categoriesResult = await listCategories(db)
  if (categoriesResult.isErr) {
    return renderExpenseLoadError(c)
  }

  const payloads: ExpenseFormPayloads = {
    categories: categoriesResult.value.map((row) => ({ name: row.name })),
    tags: tagsResult.value.map((row) => ({ id: row.id, name: row.name })),
  }
  const today = todayEt()
  const flash = readAndClearFormState(c)
  // Mint a fresh server-generated submission key per rendered page so the
  // entry form (and any confirm round-trip) can dedupe replayed submits.
  const submissionKey = ulid()
  const state: ExpenseFormState = flash
    ? {
        fieldErrors: flash.fieldErrors ?? {},
        values: {
          description: flash.values.description ?? '',
          amount: flash.values.amount ?? '',
          date: flash.values.date ?? today,
          category: flash.values.category ?? '',
          tagIds: flash.values.tagIds ?? [],
          newTags: flash.values.newTags ?? '',
          submissionKey,
        },
      }
    : { ...emptyState(today), values: { ...emptyState(today).values, submissionKey } }
  return c.render(
    useLayout(
      c,
      renderExpenses(
        expensesResult.value,
        state,
        payloads,
        categoriesResult.value,
        tagsResult.value,
        resolvedFilters,
        filterErrors,
      ),
    ),
  )
}
