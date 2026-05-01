/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expenses list page.
 * @module routes/expenses/buildExpenses
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { ALLOW_SCRIPTS_SECURE_HEADERS, PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { defaultRangeEt, todayEt } from '../../lib/et-date'
import {
  listExpenses,
  listCategories,
  listTags,
  createExpenseWithTags,
  findCategoryByName,
  findTagsByNames,
  createManyAndExpense,
  type ExpenseRow,
} from '../../lib/db/expense-access'
import { formatCents } from '../../lib/money'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseExpenseCreate,
  parseNewCategoryName,
  parseTagCsv,
  type FieldErrors,
} from '../../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../../lib/form-state'
import {
  renderExpenseForm,
  renderConfirmNewItems,
  type ExpenseFormPayloads,
  type ExpenseFormState,
} from './expense-form'

const CONFIRM_CREATE_NEW_PATH = '/expenses/confirm-create-new'

const emptyState = (today: string): ExpenseFormState => ({
  fieldErrors: {},
  values: { description: '', amount: '', date: today, category: '', tags: '' },
})

const renderExpenseTable = (rows: ExpenseRow[]) => {
  return (
    <div className='overflow-x-auto'>
      <table className='table table-zebra w-full' data-testid='expenses-table'>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Tags</th>
            <th className='text-right'>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr data-testid='expense-row' data-expense-id={row.id}>
              <td data-testid='expense-row-date'>{row.date}</td>
              <td data-testid='expense-row-description'>{row.description}</td>
              <td data-testid='expense-row-category'>{row.categoryName}</td>
              <td data-testid='expense-row-tags'>{row.tagNames.join(', ')}</td>
              <td className='text-right' data-testid='expense-row-amount'>
                {formatCents(row.amountCents)}
              </td>
              <td>
                <a
                  href={`/expenses/${row.id}/edit`}
                  className='btn btn-sm'
                  data-testid='expense-row-edit'
                >
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const renderExpenses = (
  rows: ExpenseRow[],
  state: ExpenseFormState,
  payloads: ExpenseFormPayloads,
) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {renderExpenseForm({
        mode: 'create',
        action: PATHS.EXPENSES,
        state,
        payloads,
      })}
      {rows.length === 0 ? (
        <p className='text-gray-600' data-testid='expenses-empty-state'>
          No expenses yet
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
      <script src='/js/category-combobox.js' defer></script>
      <script src='/js/tag-chip-picker.js' defer></script>
    </div>
  )
}

const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody()
  return {
    description: typeof form.description === 'string' ? form.description : '',
    amount: typeof form.amount === 'string' ? form.amount : '',
    date: typeof form.date === 'string' ? form.date : '',
    category: typeof form.category === 'string' ? form.category : '',
    tags: typeof form.tags === 'string' ? form.tags : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const range = defaultRangeEt()
      const db = createDbClient(c.env.PROJECT_DB)
      const expensesResult = await listExpenses(db, range)
      if (expensesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      const payloads: ExpenseFormPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value.map((row) => ({ name: row.name })),
      }
      const today = todayEt()
      const flash = readAndClearFormState(c)
      const state: ExpenseFormState = flash
        ? {
            fieldErrors: flash.fieldErrors ?? {},
            values: {
              description: flash.values.description ?? '',
              amount: flash.values.amount ?? '',
              date: flash.values.date ?? today,
              category: flash.values.category ?? '',
              tags: flash.values.tags ?? '',
            },
          }
        : emptyState(today)
      return c.render(useLayout(c, renderExpenses(expensesResult.value, state, payloads)))
    },
  )

  app.post(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
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
    },
  )

  app.post(
    CONFIRM_CREATE_NEW_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
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
    },
  )
}
