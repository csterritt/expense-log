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
  listCategories,
  createExpense,
  type CategoryRow,
  type ExpenseRow,
} from '../../lib/db/expense-access'
import { formatCents } from '../../lib/money'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseExpenseCreate,
  descriptionMax,
  type FieldErrors,
} from '../../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../../lib/form-state'

type EntryFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (today: string): EntryFormState => ({
  fieldErrors: {},
  values: { description: '', amount: '', date: today, categoryId: '' },
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

const selectClass = (base: string, hasError: boolean) =>
  hasError ? `${base} select-error` : base

const renderEntryForm = (
  categories: CategoryRow[],
  state: EntryFormState,
) => {
  const { fieldErrors, values } = state
  const selectedCategory = values.categoryId ?? ''
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
        <select
          id='expense-form-category'
          name='categoryId'
          required
          className={selectClass('select select-bordered', !!fieldErrors.category)}
          data-testid='expense-form-category'
        >
          <option value='' selected={selectedCategory === ''} disabled>
            Select a category
          </option>
          {categories.map((cat) => (
            <option value={cat.id} selected={selectedCategory === cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
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

const renderExpenses = (
  rows: ExpenseRow[],
  categories: CategoryRow[],
  state: EntryFormState,
) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {renderEntryForm(categories, state)}
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

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const range = defaultRangeEt()
      const db = createDbClient(c.env.PROJECT_DB)
      const [expensesResult, categoriesResult] = await Promise.all([
        listExpenses(db, range),
        listCategories(db),
      ])
      if (expensesResult.isErr || categoriesResult.isErr) {
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
              categoryId: flash.values.categoryId ?? '',
            },
          }
        : emptyState(today)
      return c.render(
        useLayout(c, renderExpenses(expensesResult.value, categoriesResult.value, state)),
      )
    },
  )

  app.post(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const form = await c.req.parseBody()
      const raw = {
        description: typeof form.description === 'string' ? form.description : '',
        amount: typeof form.amount === 'string' ? form.amount : '',
        date: typeof form.date === 'string' ? form.date : '',
        categoryId: typeof form.categoryId === 'string' ? form.categoryId : '',
      }

      const validated = parseExpenseCreate(raw)
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.EXPENSES, validated.error, raw)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const createResult = await createExpense(db, validated.value)
      if (createResult.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }

      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
    },
  )
}
