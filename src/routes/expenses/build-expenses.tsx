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
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import {
  getExpenses,
  getAllCategories,
  getAllTags,
} from '../../lib/expense-db-access'
import type { ExpenseWithDetails } from '../../lib/expense-db-access'
import type { Category, Tag } from '../../db/schema'

/**
 * Format cents as dollar string e.g. 1250 -> "12.50"
 */
const formatCents = (cents: number): string => {
  return (cents / 100).toFixed(2)
}

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get year-month string from YYYY-MM-DD date
 */
const getYearMonth = (date: string): string => date.substring(0, 7)

/**
 * Get background class for a given yearMonth relative to current
 */
const getMonthBgClass = (yearMonth: string, currentYearMonth: string): string => {
  if (yearMonth === currentYearMonth) {
    return 'bg-white'
  }
  const [cy, cm] = currentYearMonth.split('-').map(Number)
  const [ey, em] = yearMonth.split('-').map(Number)
  const diffMonths = (cy - ey) * 12 + (cm - em)
  return diffMonths % 2 === 0 ? 'bg-white' : 'bg-base-200'
}

/**
 * Render the new expense form
 */
const renderExpenseForm = (
  categories: Category[],
  today: string
) => (
  <form method='post' action={PATHS.EXPENSES.LIST} className='flex flex-col gap-3'>
    <h2 className='text-xl font-bold'>Add Expense</h2>
    <div className='flex flex-wrap gap-3'>
      <div className='form-control'>
        <label className='label' htmlFor='expense-amount'>
          <span className='label-text'>Amount ($)</span>
        </label>
        <input
          id='expense-amount'
          name='amount'
          type='number'
          step='0.01'
          min='0.01'
          placeholder='0.00'
          required
          className='input input-bordered w-36'
          data-testid='expense-amount-input'
        />
      </div>

      <div className='form-control'>
        <label className='label' htmlFor='expense-date'>
          <span className='label-text'>Date</span>
        </label>
        <input
          id='expense-date'
          name='date'
          type='date'
          required
          value={today}
          className='input input-bordered'
          data-testid='expense-date-input'
        />
      </div>

      <div className='form-control flex-1'>
        <label className='label' htmlFor='expense-description'>
          <span className='label-text'>Description</span>
        </label>
        <input
          id='expense-description'
          name='description'
          type='text'
          placeholder='What was this for?'
          required
          maxLength={502}
          className='input input-bordered w-full'
          data-testid='expense-description-input'
        />
      </div>
    </div>

    <div className='flex flex-wrap gap-3'>
      <div className='form-control'>
        <label className='label' htmlFor='expense-category'>
          <span className='label-text'>Category</span>
        </label>
        <select
          id='expense-category'
          name='categoryId'
          className='select select-bordered'
          data-testid='expense-category-select'
        >
          <option value=''>— none —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className='form-control flex-1'>
        <label className='label' htmlFor='expense-new-category'>
          <span className='label-text'>Or new category</span>
        </label>
        <input
          id='expense-new-category'
          name='newCategory'
          type='text'
          placeholder='Type to create new category'
          maxLength={102}
          className='input input-bordered'
          data-testid='expense-new-category-input'
        />
      </div>
    </div>

    <div className='form-control'>
      <label className='label' htmlFor='expense-tags'>
        <span className='label-text'>Tags (comma-separated)</span>
      </label>
      <input
        id='expense-tags'
        name='newTags'
        type='text'
        placeholder='e.g. work, personal'
        className='input input-bordered'
        data-testid='expense-tags-input'
      />
    </div>

    <div className='card-actions'>
      <button
        type='submit'
        className='btn btn-primary'
        data-testid='create-expense-action'
      >
        Add Expense
      </button>
    </div>
  </form>
)

/**
 * Render the expense history table
 */
const renderExpenseHistory = (
  expenses: ExpenseWithDetails[],
  today: string,
  categoryFilter: string,
  tagFilter: string,
  descFilter: string,
  sortAsc: boolean,
  categories: Category[],
  tags: Tag[]
) => {
  const currentYearMonth = getYearMonth(today)

  return (
    <div className='mt-8'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl font-bold'>Expense History</h2>
        <form method='get' action={PATHS.EXPENSES.LIST} className='flex flex-wrap gap-2 items-end'>
          <div className='form-control'>
            <select
              name='categoryId'
              className='select select-bordered select-sm'
              data-testid='filter-category-select'
            >
              <option value=''>All categories</option>
              {categories.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.id}
                  selected={cat.id === categoryFilter}
                >
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className='form-control'>
            <select
              name='tagId'
              className='select select-bordered select-sm'
              data-testid='filter-tag-select'
            >
              <option value=''>All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id} selected={t.id === tagFilter}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className='form-control'>
            <input
              name='desc'
              type='text'
              placeholder='Search description'
              value={descFilter}
              className='input input-bordered input-sm'
              data-testid='filter-description-input'
            />
          </div>
          <button
            type='submit'
            className='btn btn-sm btn-outline'
            data-testid='filter-action'
          >
            Filter
          </button>
          <a
            href={`${PATHS.EXPENSES.LIST}?sort=${sortAsc ? 'desc' : 'asc'}`}
            className='btn btn-sm btn-ghost'
            data-testid='sort-toggle-action'
          >
            Sort {sortAsc ? '↓' : '↑'}
          </a>
        </form>
      </div>

      <div data-testid='expense-history'>
        {expenses.length === 0 ? (
          <p className='text-gray-500 text-center py-8' data-testid='no-expenses-message'>
            No expenses yet. Add your first expense above!
          </p>
        ) : (
          <table className='table table-zebra w-full'>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Tags</th>
                <th className='text-right'>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const ym = getYearMonth(exp.date)
                const bgClass = getMonthBgClass(ym, currentYearMonth)
                return (
                  <tr key={exp.id} className={bgClass} data-testid={`expense-row-${exp.id}`}>
                    <td data-testid={`expense-date-${exp.id}`}>{exp.date}</td>
                    <td data-testid={`expense-description-${exp.id}`}>{exp.description}</td>
                    <td data-testid={`expense-category-${exp.id}`}>{exp.categoryName ?? '—'}</td>
                    <td data-testid={`expense-tags-${exp.id}`}>
                      {exp.tags.map((t) => t.name).join(', ') || '—'}
                    </td>
                    <td className='text-right' data-testid={`expense-amount-${exp.id}`}>
                      ${formatCents(exp.amountCents)}
                    </td>
                    <td className='flex gap-2'>
                      <a
                        href={PATHS.EXPENSES.EDIT.replace(':id', exp.id)}
                        className='btn btn-xs btn-outline'
                        data-testid={`edit-expense-${exp.id}`}
                      >
                        Edit
                      </a>
                      <form
                        method='post'
                        action={PATHS.EXPENSES.DELETE.replace(':id', exp.id)}
                      >
                        <button
                          type='submit'
                          className='btn btn-xs btn-error btn-outline'
                          data-testid={`delete-expense-${exp.id}`}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/**
 * Render the full expenses page
 */
const renderExpensesPage = (
  expenses: ExpenseWithDetails[],
  categories: Category[],
  tags: Tag[],
  today: string,
  categoryFilter: string,
  tagFilter: string,
  descFilter: string,
  sortAsc: boolean
) => (
  <div data-testid='expenses-page' className='w-full'>
    <div className='card bg-base-100 shadow-xl mb-6'>
      <div className='card-body'>
        {renderExpenseForm(categories, today)}
      </div>
    </div>

    {renderExpenseHistory(
      expenses,
      today,
      categoryFilter,
      tagFilter,
      descFilter,
      sortAsc,
      categories,
      tags
    )}
  </div>
)

/**
 * Attach the expenses list route to the app.
 */
export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES.LIST,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const db = c.get('db')
      const today = getTodayDate()
      const categoryFilter = c.req.query('categoryId') ?? ''
      const tagFilter = c.req.query('tagId') ?? ''
      const descFilter = c.req.query('desc') ?? ''
      const sortAsc = c.req.query('sort') === 'asc'

      const typedDb = db as DrizzleClient
      const [expensesResult, categoriesResult, tagsResult] = await Promise.all([
        getExpenses(typedDb, {
          categoryId: categoryFilter || undefined,
          tagId: tagFilter || undefined,
          descriptionSearch: descFilter || undefined,
          sortAsc,
        }),
        getAllCategories(typedDb),
        getAllTags(typedDb),
      ])

      const expenses = expensesResult.isOk ? expensesResult.value : []
      const categories = categoriesResult.isOk ? categoriesResult.value : []
      const tags = tagsResult.isOk ? tagsResult.value : []

      return c.render(
        useLayout(
          c,
          renderExpensesPage(
            expenses,
            categories,
            tags,
            today,
            categoryFilter,
            tagFilter,
            descFilter,
            sortAsc
          )
        )
      )
    }
  )
}
