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
  descriptionMax,
  categoryNameMax,
  tagNameMax,
  type FieldErrors,
} from '../../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../../lib/form-state'

const CONFIRM_CREATE_NEW_PATH = '/expenses/confirm-create-new'
// Generous CSV maxlength: enough for ~8 max-length tags plus separators.
const tagsCsvMax = (tagNameMax + 2) * 8

type EntryFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (today: string): EntryFormState => ({
  fieldErrors: {},
  values: { description: '', amount: '', date: today, category: '', tags: '' },
})

const fieldError = (field: keyof FieldErrors, message?: string) => {
  if (!message) {
    return null
  }
  return (
    <p
      className='text-error text-sm mt-1'
      data-testid={`expense-form-${field}-error`}
    >
      {message}
    </p>
  )
}

const inputClass = (base: string, hasError: boolean) =>
  hasError ? `${base} input-error` : base

// Serialize a JSON payload safely for embedding inside a <script> tag.
// Escaping `<` (and `>` / `&` defensively) prevents a stray `</script>`
// in any data field from breaking out of the script element.
const safeJsonForScript = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

type EntryPayloads = {
  categories: { name: string }[]
  tags: { name: string }[]
}

const renderEntryForm = (state: EntryFormState, payloads: EntryPayloads) => {
  const { fieldErrors, values } = state
  return (
    <form
      method='post'
      action={PATHS.EXPENSES}
      className='mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-start'
      data-testid='expense-form'
      noValidate
    >
      <div className='flex flex-col md:col-span-2'>
        <label className='label' htmlFor='expense-form-description'>
          <span className='label-text'>Description</span>
        </label>
        <input
          id='expense-form-description'
          name='description'
          type='text'
          required
          maxLength={descriptionMax + 50}
          className={inputClass('input input-bordered w-full', !!fieldErrors.description)}
          data-testid='expense-form-description'
          value={values.description ?? ''}
        />
        {fieldError('description', fieldErrors.description)}
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-amount'>
          <span className='label-text'>Amount</span>
        </label>
        <input
          id='expense-form-amount'
          name='amount'
          type='text'
          inputMode='decimal'
          required
          className={inputClass('input input-bordered', !!fieldErrors.amount)}
          data-testid='expense-form-amount'
          value={values.amount ?? ''}
        />
        {fieldError('amount', fieldErrors.amount)}
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-date'>
          <span className='label-text'>Date</span>
        </label>
        <input
          id='expense-form-date'
          name='date'
          type='text'
          required
          pattern='\d{4}-\d{2}-\d{2}'
          className={inputClass('input input-bordered', !!fieldErrors.date)}
          data-testid='expense-form-date'
          value={values.date ?? ''}
          placeholder='YYYY-MM-DD'
        />
        {fieldError('date', fieldErrors.date)}
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-category'>
          <span className='label-text'>Category</span>
        </label>
        <input
          id='expense-form-category'
          name='category'
          type='text'
          required
          maxLength={categoryNameMax + 50}
          className={inputClass('input input-bordered', !!fieldErrors.category)}
          data-testid='expense-form-category'
          data-category-combobox
          value={values.category ?? ''}
          placeholder='Type a category'
        />
        {fieldError('category', fieldErrors.category)}
      </div>
      <div className='flex flex-col md:col-span-5'>
        <label className='label' htmlFor='expense-form-tags'>
          <span className='label-text'>Tags (comma-separated)</span>
        </label>
        <input
          id='expense-form-tags'
          name='tags'
          type='text'
          maxLength={tagsCsvMax}
          className={inputClass('input input-bordered w-full', !!fieldErrors.tags)}
          data-testid='expense-form-tags'
          data-tag-chip-picker
          value={values.tags ?? ''}
          placeholder='e.g. food, groceries'
        />
        {fieldError('tags', fieldErrors.tags)}
      </div>
      <div className='md:col-span-5'>
        <button
          type='submit'
          className='btn btn-primary'
          data-testid='expense-form-create'
        >
          Add expense
        </button>
      </div>
      <script
        type='application/json'
        data-testid='categories-data'
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.categories) }}
      />
      <script
        type='application/json'
        data-testid='tags-data'
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.tags) }}
      />
    </form>
  )
}

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const renderExpenses = (
  rows: ExpenseRow[],
  state: EntryFormState,
  payloads: EntryPayloads,
) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {renderEntryForm(state, payloads)}
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

type ConfirmCreateNewProps = {
  // Normalized (lowercased, trimmed) new category name, or null when the
  // category already exists.
  newCategoryName: string | null
  // Final category name to display in the preview (existing match name or
  // the normalized new-category name).
  finalCategoryName: string
  // Normalized new-tag names (lowercased, trimmed, de-duplicated). Already
  // alphabetized by the caller.
  newTagNames: string[]
  // Final tag list to display in the preview (alphabetized).
  finalTagNames: string[]
  // Raw values from the entry form (exact strings to round-trip on Cancel).
  values: ExpenseFormValues
}

const renderConfirmCreateNew = (props: ConfirmCreateNewProps) => {
  const { newCategoryName, finalCategoryName, newTagNames, finalTagNames, values } = props
  const amountDisplay = (values.amount ?? '').trim()
  return (
    <div
      className='max-w-xl mx-auto'
      data-testid='confirm-create-new-page'
    >
      <h1 className='text-2xl font-bold mb-4'>Confirm new items</h1>
      <ul className='mb-4 list-disc list-inside' data-testid='confirm-create-new-list'>
        {newCategoryName !== null ? (
          <li data-testid='confirm-create-new-category-line'>
            Create category <strong>'{newCategoryName}'</strong>
          </li>
        ) : null}
        {newTagNames.map((name) => (
          <li data-testid='confirm-create-new-tag-line'>
            Create tag <strong>'{name}'</strong>
          </li>
        ))}
      </ul>
      <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mb-6'>
        <dt className='font-semibold'>Description</dt>
        <dd data-testid='confirm-create-new-description'>
          {values.description ?? ''}
        </dd>
        <dt className='font-semibold'>Amount</dt>
        <dd data-testid='confirm-create-new-amount'>{amountDisplay}</dd>
        <dt className='font-semibold'>Date</dt>
        <dd data-testid='confirm-create-new-date'>{values.date ?? ''}</dd>
        <dt className='font-semibold'>Category</dt>
        <dd data-testid='confirm-create-new-category'>{finalCategoryName}</dd>
        <dt className='font-semibold'>Tags</dt>
        <dd data-testid='confirm-create-new-tags'>{finalTagNames.join(', ')}</dd>
      </dl>
      <form
        method='post'
        action={CONFIRM_CREATE_NEW_PATH}
        className='flex gap-3'
        data-testid='confirm-create-new-form'
        noValidate
      >
        <input type='hidden' name='description' value={values.description ?? ''} />
        <input type='hidden' name='amount' value={values.amount ?? ''} />
        <input type='hidden' name='date' value={values.date ?? ''} />
        <input type='hidden' name='category' value={values.category ?? ''} />
        <input type='hidden' name='tags' value={values.tags ?? ''} />
        <button
          type='submit'
          name='action'
          value='confirm'
          className='btn btn-primary'
          data-testid='confirm-create-new-confirm'
        >
          Confirm
        </button>
        <button
          type='submit'
          name='action'
          value='cancel'
          className='btn btn-ghost'
          data-testid='confirm-create-new-cancel'
        >
          Cancel
        </button>
      </form>
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
      const payloads: EntryPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value.map((row) => ({ name: row.name })),
      }
      const today = todayEt()
      const flash = readAndClearFormState(c)
      const state: EntryFormState = flash
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
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }

      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
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
          return redirectWithError(
            c,
            PATHS.EXPENSES,
            'Failed to save expense. Please try again.',
          )
        }
        return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
      }

      // Something is new — validate the new-category name when applicable.
      let normalizedNewCategory: string | null = null
      let finalCategoryName: string
      if (categoryIsNew) {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(
            c,
            PATHS.EXPENSES,
            { category: nameCheck.error },
            rawValues,
          )
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
          renderConfirmCreateNew({
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
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
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
          return redirectWithFormErrors(
            c,
            PATHS.EXPENSES,
            { category: nameCheck.error },
            rawValues,
          )
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
