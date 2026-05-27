/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expense edit + delete pages.
 * @module routes/expenses/buildEditExpense
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { ALLOW_SCRIPTS_SECURE_HEADERS, PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import {
  getExpenseById,
  updateExpenseWithTags,
  updateManyAndExpense,
  deleteExpense,
} from '../../lib/db/expense-access'
import {
  listCategories,
  findCategoryByName,
} from '../../lib/db/category-access'
import {
  listTags,
} from '../../lib/db/tag-access'
import { formatCents, formatCentsPlain } from '../../lib/money'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseExpenseCreate,
  parseNewCategoryName,
  parseTagInputs,
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

const requireId = (c: Context<{ Bindings: Bindings }>): string => {
  const id = c.req.param('id')
  if (typeof id !== 'string' || id.length === 0) {
    return ''
  }
  return id
}

const editPath = (id: string): string => `/expenses/${id}/edit`
const confirmEditNewPath = (id: string): string => `/expenses/${id}/confirm-edit-new`
const deletePath = (id: string): string => `/expenses/${id}/delete`

const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody({ all: true })
  const rawTagId = form['tagId']
  const tagId: string[] = Array.isArray(rawTagId)
    ? rawTagId.filter((v): v is string => typeof v === 'string')
    : typeof rawTagId === 'string'
      ? [rawTagId]
      : []
  return {
    description: typeof form.description === 'string' ? form.description : '',
    amount: typeof form.amount === 'string' ? form.amount : '',
    date: typeof form.date === 'string' ? form.date : '',
    category: typeof form.category === 'string' ? form.category : '',
    tagId,
    newTags: typeof form.newTags === 'string' ? form.newTags : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}

type EditFormProps = {
  expenseId: string
  state: ExpenseFormState
  payloads: ExpenseFormPayloads
}

const renderEditPage = (props: EditFormProps) => {
  const { expenseId, state, payloads } = props
  return (
    <div data-testid='expense-edit-page'>
      <h1 className='text-2xl font-bold mb-4'>Edit expense</h1>
      {renderExpenseForm({
        mode: 'edit',
        action: editPath(expenseId),
        state,
        payloads,
      })}
      <div className='mt-4 flex flex-row justify-between'>
        <a
          href={deletePath(expenseId)}
          className='btn btn-error btn-outline'
          data-testid='expense-edit-delete'
        >
          Delete expense
        </a>
        <a href={PATHS.EXPENSES} className='btn btn-ghost ml-2' data-testid='expense-edit-back'>
          Back to list
        </a>
      </div>
      <script src='/js/category-combobox.js' defer></script>
      <script src='/js/tag-chip-checkboxes.js' defer></script>
    </div>
  )
}

type DeleteConfirmProps = {
  id: string
  date: string
  description: string
  amountCents: number
  categoryName: string
  tagNames: string[]
}

const renderDeleteConfirm = (props: DeleteConfirmProps) => {
  const { id, date, description, amountCents, categoryName, tagNames } = props
  return (
    <div className='max-w-xl mx-auto' data-testid='confirm-delete-expense-page'>
      <h1 className='text-2xl font-bold mb-4'>Delete expense?</h1>
      <p className='mb-4'>
        This action cannot be undone. The expense and its tag links will be permanently removed.
      </p>
      <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mb-6'>
        <dt className='font-semibold'>Date</dt>
        <dd data-testid='confirm-delete-expense-date'>{date}</dd>
        <dt className='font-semibold'>Description</dt>
        <dd data-testid='confirm-delete-expense-description'>{description}</dd>
        <dt className='font-semibold'>Amount</dt>
        <dd data-testid='confirm-delete-expense-amount'>{formatCents(amountCents)}</dd>
        <dt className='font-semibold'>Category</dt>
        <dd data-testid='confirm-delete-expense-category'>{categoryName}</dd>
        <dt className='font-semibold'>Tags</dt>
        <dd data-testid='confirm-delete-expense-tags'>{tagNames.join(', ')}</dd>
      </dl>
      <form
        method='post'
        action={deletePath(id)}
        className='flex gap-3'
        data-testid='confirm-delete-expense-form'
        noValidate
      >
        <button
          type='submit'
          className='btn btn-error'
          data-testid='confirm-delete-expense-confirm'
        >
          Delete
        </button>
        <a
          href={editPath(id)}
          className='btn btn-ghost'
          data-testid='confirm-delete-expense-cancel'
        >
          Cancel
        </a>
      </form>
    </div>
  )
}

// Build an `ExpenseFormState` from a loaded expense + categories/tags +
// any flash form-state. Flash values, when present, completely override
// the loaded values so a post-error redirect re-renders exactly what the
// user typed.
const buildEditState = (
  loaded: {
    date: string
    description: string
    amountCents: number
    categoryName: string
    tagNames: string[]
    tagIds: string[]
  },
  flash: { fieldErrors?: FieldErrors; values?: ExpenseFormValues } | undefined,
): ExpenseFormState => {
  const seedValues: ExpenseFormValues = {
    description: loaded.description,
    amount: formatCentsPlain(loaded.amountCents),
    date: loaded.date,
    category: loaded.categoryName,
    tagIds: loaded.tagIds,
    newTags: '',
  }
  if (!flash) {
    return { fieldErrors: {}, values: seedValues }
  }
  return {
    fieldErrors: flash.fieldErrors ?? {},
    values: {
      description: flash.values?.description ?? seedValues.description,
      amount: flash.values?.amount ?? seedValues.amount,
      date: flash.values?.date ?? seedValues.date,
      category: flash.values?.category ?? seedValues.category,
      tagIds: flash.values?.tagIds ?? seedValues.tagIds,
      newTags: flash.values?.newTags ?? seedValues.newTags,
    },
  }
}

export const buildEditExpense = (app: Hono<{ Bindings: Bindings }>): void => {
  // ---------- GET /expenses/:id/edit ----------
  app.get(
    '/expenses/:id/edit',
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const db = createDbClient(c.env.PROJECT_DB)
      const expenseResult = await getExpenseById(db, id)
      if (expenseResult.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load expense. Please try again.')
      }
      if (expenseResult.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }
      const loaded = expenseResult.value
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load expense. Please try again.')
      }
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load expense. Please try again.')
      }
      const payloads: ExpenseFormPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value.map((row) => ({ id: row.id, name: row.name })),
      }
      const flash = readAndClearFormState(c)
      const state = buildEditState(loaded, flash)
      return c.render(useLayout(c, renderEditPage({ expenseId: id, state, payloads })))
    },
  )

  // ---------- POST /expenses/:id/edit ----------
  app.post(
    '/expenses/:id/edit',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
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
        return redirectWithFormErrors(c, editPath(id), validated.error, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const existing = await getExpenseById(db, id)
      if (existing.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
      }
      if (existing.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }

      const allTagsResult = await listTags(db)
      if (allTagsResult.isErr) {
        return redirectWithError(c, editPath(id), 'Failed to save expense. Please try again.')
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
        return redirectWithFormErrors(c, editPath(id), tagInputParse.fieldErrors, rawValues)
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, editPath(id), 'Failed to save expense. Please try again.')
      }

      const existingTagIds = tagInputParse.tagIds
      const newTagNames = tagInputParse.newTags
      const categoryIsNew = lookup.value === null
      const anyNew = categoryIsNew || newTagNames.length > 0

      if (!anyNew) {
        const updateResult = await updateExpenseWithTags(db, {
          id,
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          date: validated.value.date,
          categoryId: lookup.value!.id,
          tagIds: existingTagIds,
        })
        if (updateResult.isErr) {
          return redirectWithError(c, editPath(id), 'Failed to save expense. Please try again.')
        }
        return redirectWithMessage(c, PATHS.EXPENSES, 'Expense updated.')
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
          return redirectWithFormErrors(c, editPath(id), { category: nameCheck.error }, rawValues)
        }
        normalizedNewCategory = nameCheck.value.toLowerCase()
        finalCategoryName = normalizedNewCategory
      } else {
        finalCategoryName = lookup.value!.name
      }

      const resolvedById = new Map(allTagsResult.value.map((t) => [t.id, t.name]))
      const existingTagNames = existingTagIds.map((id) => resolvedById.get(id) ?? '').filter(Boolean)

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
            mode: 'edit',
            action: confirmEditNewPath(id),
            newCategoryName: normalizedNewCategory,
            finalCategoryName,
            newTagNames: sortedNewTags,
            finalTagNames,
            values: confirmValues,
          }),
        ),
      )
    },
  )

  // ---------- POST /expenses/:id/confirm-edit-new ----------
  app.post(
    '/expenses/:id/confirm-edit-new',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
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
        return redirectWithFormErrors(c, editPath(id), {}, cancelValues)
      }

      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
        tagIds: raw.tagId,
        newTags: raw.newTags,
      }

      const validated = parseExpenseCreate({
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
      })
      if (validated.isErr) {
        return redirectWithFormErrors(c, editPath(id), validated.error, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const existing = await getExpenseById(db, id)
      if (existing.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
      }
      if (existing.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }

      const allTagsResult = await listTags(db)
      if (allTagsResult.isErr) {
        return redirectWithError(c, editPath(id), 'Failed to save expense. Please try again.')
      }

      const tagInputParse = parseTagInputs(
        { tagId: raw.tagId, newTags: raw.newTags },
        allTagsResult.value,
      )
      if (Object.keys(tagInputParse.fieldErrors).length > 0) {
        return redirectWithFormErrors(c, editPath(id), tagInputParse.fieldErrors, rawValues)
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, editPath(id), 'Failed to save expense. Please try again.')
      }

      const existingTagIds = tagInputParse.tagIds
      const newTagNames = tagInputParse.newTags

      let newCategoryName: string | null = null
      let existingCategoryId: string | null = null
      if (lookup.value !== null) {
        existingCategoryId = lookup.value.id
      } else {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(c, editPath(id), { category: nameCheck.error }, rawValues)
        }
        newCategoryName = nameCheck.value
      }

      const updateResult = await updateManyAndExpense(db, {
        id,
        newCategoryName,
        existingCategoryId,
        newTagNames,
        existingTagIds,
        date: validated.value.date,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
      })
      if (updateResult.isErr) {
        const errs: FieldErrors =
          newCategoryName !== null
            ? { category: updateResult.error.message }
            : { tags: updateResult.error.message }
        return redirectWithFormErrors(c, editPath(id), errs, rawValues)
      }

      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense updated.')
    },
  )

  // ---------- GET /expenses/:id/delete ----------
  app.get(
    '/expenses/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await getExpenseById(db, id)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load expense. Please try again.')
      }
      if (result.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }
      const row = result.value
      return c.render(
        useLayout(
          c,
          renderDeleteConfirm({
            id: row.id,
            date: row.date,
            description: row.description,
            amountCents: row.amountCents,
            categoryName: row.categoryName,
            tagNames: row.tagNames,
          }),
        ),
      )
    },
  )

  // ---------- POST /expenses/:id/delete ----------
  app.post(
    '/expenses/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await deleteExpense(db, id)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to delete expense. Please try again.')
      }
      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense deleted.')
    },
  )
}
