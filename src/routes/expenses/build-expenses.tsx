/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expenses list page.
 * @module routes/expenses/buildExpenses
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { defaultRangeEt, todayEt } from '../../lib/et-date'
import {
  listExpenses,
  createExpense,
  findCategoryByName,
  createCategoryAndExpense,
  type ExpenseRow,
} from '../../lib/db/expense-access'
import { formatCents } from '../../lib/money'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseExpenseCreate,
  parseNewCategoryName,
  descriptionMax,
  categoryNameMax,
  type FieldErrors,
} from '../../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../../lib/form-state'

const CONFIRM_CREATE_CATEGORY_PATH = '/expenses/confirm-create-category'

type EntryFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (today: string): EntryFormState => ({
  fieldErrors: {},
  values: { description: '', amount: '', date: today, category: '' },
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

const renderEntryForm = (state: EntryFormState) => {
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
          value={values.category ?? ''}
          placeholder='Type a category'
        />
        {fieldError('category', fieldErrors.category)}
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

const renderExpenses = (rows: ExpenseRow[], state: EntryFormState) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {renderEntryForm(state)}
      {rows.length === 0 ? (
        <p className='text-gray-600' data-testid='expenses-empty-state'>
          No expenses yet
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
    </div>
  )
}

type ConfirmCreateCategoryProps = {
  normalizedName: string
  values: ExpenseFormValues
}

const renderConfirmCreateCategory = (props: ConfirmCreateCategoryProps) => {
  const { normalizedName, values } = props
  const amountDisplay = (() => {
    const trimmed = (values.amount ?? '').trim()
    if (trimmed.length === 0) {
      return ''
    }
    // Best-effort preview: show the raw typed value. Exact formatting is
    // applied server-side at create time via `formatCents`.
    return trimmed
  })()
  return (
    <div
      className='max-w-xl mx-auto'
      data-testid='confirm-create-category-page'
    >
      <h1 className='text-2xl font-bold mb-4'>Confirm new category</h1>
      <p className='mb-4'>
        Create category{' '}
        <strong data-testid='confirm-create-category-name'>
          '{normalizedName}'
        </strong>{' '}
        and add this expense?
      </p>
      <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mb-6'>
        <dt className='font-semibold'>Description</dt>
        <dd data-testid='confirm-create-category-description'>
          {values.description ?? ''}
        </dd>
        <dt className='font-semibold'>Amount</dt>
        <dd data-testid='confirm-create-category-amount'>{amountDisplay}</dd>
        <dt className='font-semibold'>Date</dt>
        <dd data-testid='confirm-create-category-date'>{values.date ?? ''}</dd>
        <dt className='font-semibold'>Category</dt>
        <dd data-testid='confirm-create-category-category'>
          {normalizedName}
        </dd>
      </dl>
      <form
        method='post'
        action={CONFIRM_CREATE_CATEGORY_PATH}
        className='flex gap-3'
        data-testid='confirm-create-category-form'
        noValidate
      >
        <input type='hidden' name='description' value={values.description ?? ''} />
        <input type='hidden' name='amount' value={values.amount ?? ''} />
        <input type='hidden' name='date' value={values.date ?? ''} />
        <input type='hidden' name='category' value={values.category ?? ''} />
        <button
          type='submit'
          name='action'
          value='confirm'
          className='btn btn-primary'
          data-testid='confirm-create-category-confirm'
        >
          Confirm
        </button>
        <button
          type='submit'
          name='action'
          value='cancel'
          className='btn btn-ghost'
          data-testid='confirm-create-category-cancel'
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
    action: typeof form.action === 'string' ? form.action : '',
  }
}

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
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
            },
          }
        : emptyState(today)
      return c.render(useLayout(c, renderExpenses(expensesResult.value, state)))
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
      }

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
      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }

      if (lookup.value !== null) {
        // Existing category: create the expense directly.
        const createResult = await createExpense(db, {
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          date: validated.value.date,
          categoryId: lookup.value.id,
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

      // No match — validate the typed name for length/empty, then render
      // the consolidated confirmation page. No DB writes yet.
      const nameCheck = parseNewCategoryName(validated.value.category)
      if (nameCheck.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.EXPENSES,
          { category: nameCheck.error },
          rawValues,
        )
      }

      const normalizedName = nameCheck.value.toLowerCase()
      return c.render(
        useLayout(
          c,
          renderConfirmCreateCategory({ normalizedName, values: rawValues }),
        ),
      )
    },
  )

  app.post(
    CONFIRM_CREATE_CATEGORY_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
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
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.EXPENSES, validated.error, rawValues)
      }

      const nameCheck = parseNewCategoryName(validated.value.category)
      if (nameCheck.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.EXPENSES,
          { category: nameCheck.error },
          rawValues,
        )
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const createResult = await createCategoryAndExpense(db, {
        newCategoryName: nameCheck.value,
        date: validated.value.date,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
      })
      if (createResult.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.EXPENSES,
          { category: createResult.error.message },
          rawValues,
        )
      }

      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
    },
  )
}
