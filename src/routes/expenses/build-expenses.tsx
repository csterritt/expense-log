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
import { defaultRangeEt, isValidYmd, todayEt } from '../../lib/et-date'
import {
  listExpenses,
  listCategories,
  createExpense,
  type CategoryRow,
  type ExpenseRow,
} from '../../lib/db/expense-access'
import { formatCents, parseAmount } from '../../lib/money'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'

// const descriptionMax = 200 // PRODUCTION:UNCOMMENT
const descriptionMax = 202

const renderEntryForm = (categories: CategoryRow[], today: string) => {
  return (
    <form
      method='post'
      action={PATHS.EXPENSES}
      className='mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end'
      data-testid='expense-form'
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
          maxLength={descriptionMax}
          className='input input-bordered'
          data-testid='expense-form-description'
        />
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
          className='input input-bordered'
          data-testid='expense-form-amount'
        />
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-date'>
          <span className='label-text'>Date</span>
        </label>
        <input
          id='expense-form-date'
          name='date'
          type='date'
          required
          value={today}
          className='input input-bordered'
          data-testid='expense-form-date'
        />
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-category'>
          <span className='label-text'>Category</span>
        </label>
        <select
          id='expense-form-category'
          name='categoryId'
          required
          className='select select-bordered'
          data-testid='expense-form-category'
          defaultValue=''
        >
          <option value='' disabled>
            Select a category
          </option>
          {categories.map((cat) => (
            <option value={cat.id}>{cat.name}</option>
          ))}
        </select>
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

const renderExpenses = (rows: ExpenseRow[], categories: CategoryRow[], today: string) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {renderEntryForm(categories, today)}
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

interface ValidatedExpenseInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
}

const validateExpenseForm = (
  raw: Record<string, string>,
): { ok: true; value: ValidatedExpenseInput } | { ok: false; error: string } => {
  const description = (raw.description ?? '').trim()
  if (description === '') {
    return { ok: false, error: 'Description is required.' }
  }
  if (description.length > descriptionMax) {
    return { ok: false, error: `Description must be at most ${descriptionMax} characters.` }
  }

  const date = (raw.date ?? '').trim()
  if (!isValidYmd(date)) {
    return { ok: false, error: 'Date must be a valid YYYY-MM-DD value.' }
  }

  const categoryId = (raw.categoryId ?? '').trim()
  if (categoryId === '') {
    return { ok: false, error: 'Category is required.' }
  }

  const amountResult = parseAmount(raw.amount ?? '')
  if (amountResult.isErr) {
    return { ok: false, error: amountResult.error }
  }

  return {
    ok: true,
    value: { date, description, categoryId, amountCents: amountResult.value },
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
      return c.render(
        useLayout(
          c,
          renderExpenses(expensesResult.value, categoriesResult.value, todayEt()),
        ),
      )
    },
  )

  app.post(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const form = await c.req.parseBody()
      const raw: Record<string, string> = {
        description: typeof form.description === 'string' ? form.description : '',
        amount: typeof form.amount === 'string' ? form.amount : '',
        date: typeof form.date === 'string' ? form.date : '',
        categoryId: typeof form.categoryId === 'string' ? form.categoryId : '',
      }

      const validated = validateExpenseForm(raw)
      if (!validated.ok) {
        return redirectWithError(c, PATHS.EXPENSES, validated.error)
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
