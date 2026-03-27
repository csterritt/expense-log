/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expense summary page.
 * @module routes/expenses/buildSummary
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import { getExpenses, getAllCategories, getAllTags } from '../../lib/expense-db-access'
import type { ExpenseWithDetails } from '../../lib/expense-db-access'
import type { Category, Tag } from '../../db/schema'

/**
 * Format cents as dollar string e.g. 1250 -> "12.50"
 */
const formatCents = (cents: number): string => (cents / 100).toFixed(2)

interface CategoryTotal {
  id: string
  name: string
  totalCents: number
  count: number
}

interface TagTotal {
  id: string
  name: string
  totalCents: number
  count: number
}

/**
 * Compute totals per category
 */
const computeCategoryTotals = (expenses: ExpenseWithDetails[]): CategoryTotal[] => {
  const map = new Map<string, CategoryTotal>()

  for (const exp of expenses) {
    const key = exp.categoryId ?? '__none__'
    const name = exp.categoryName ?? '(No category)'
    if (!map.has(key)) {
      map.set(key, { id: key, name, totalCents: 0, count: 0 })
    }
    const entry = map.get(key)!
    entry.totalCents += exp.amountCents
    entry.count += 1
  }

  return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents)
}

/**
 * Compute totals per tag
 */
const computeTagTotals = (expenses: ExpenseWithDetails[]): TagTotal[] => {
  const map = new Map<string, TagTotal>()

  for (const exp of expenses) {
    if (exp.tags.length === 0) {
      const key = '__none__'
      if (!map.has(key)) {
        map.set(key, { id: key, name: '(No tag)', totalCents: 0, count: 0 })
      }
      const entry = map.get(key)!
      entry.totalCents += exp.amountCents
      entry.count += 1
    } else {
      for (const t of exp.tags) {
        if (!map.has(t.id)) {
          map.set(t.id, { id: t.id, name: t.name, totalCents: 0, count: 0 })
        }
        const entry = map.get(t.id)!
        entry.totalCents += exp.amountCents
        entry.count += 1
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents)
}

/**
 * Render the summary page
 */
const renderSummaryPage = (
  expenses: ExpenseWithDetails[],
  categories: Category[],
  tags: Tag[],
  categoryFilter: string,
  tagFilter: string,
  dateFrom: string,
  dateTo: string
) => {
  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0)
  const categoryTotals = computeCategoryTotals(expenses)
  const tagTotals = computeTagTotals(expenses)

  return (
    <div data-testid='summary-page' className='w-full'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold'>Expense Summary</h1>
        <a
          href={PATHS.EXPENSES.LIST}
          className='btn btn-outline btn-sm'
          data-testid='back-to-expenses-action'
        >
          Back to Expenses
        </a>
      </div>

      {/* Filters */}
      <div className='card bg-base-100 shadow-xl mb-6'>
        <div className='card-body'>
          <h2 className='card-title'>Filters</h2>
          <form method='get' action={PATHS.EXPENSES.SUMMARY} className='flex flex-wrap gap-3 items-end'>
            <div className='form-control'>
              <label className='label' htmlFor='summary-category'>
                <span className='label-text'>Category</span>
              </label>
              <select
                id='summary-category'
                name='categoryId'
                className='select select-bordered select-sm'
                data-testid='summary-category-select'
              >
                <option value=''>All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} selected={cat.id === categoryFilter}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='form-control'>
              <label className='label' htmlFor='summary-tag'>
                <span className='label-text'>Tag</span>
              </label>
              <select
                id='summary-tag'
                name='tagId'
                className='select select-bordered select-sm'
                data-testid='summary-tag-select'
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
              <label className='label' htmlFor='summary-date-from'>
                <span className='label-text'>From</span>
              </label>
              <input
                id='summary-date-from'
                name='dateFrom'
                type='date'
                value={dateFrom}
                className='input input-bordered input-sm'
                data-testid='summary-date-from-input'
              />
            </div>

            <div className='form-control'>
              <label className='label' htmlFor='summary-date-to'>
                <span className='label-text'>To</span>
              </label>
              <input
                id='summary-date-to'
                name='dateTo'
                type='date'
                value={dateTo}
                className='input input-bordered input-sm'
                data-testid='summary-date-to-input'
              />
            </div>

            <button
              type='submit'
              className='btn btn-sm btn-primary'
              data-testid='summary-filter-action'
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* Overall total */}
      <div className='card bg-base-100 shadow-xl mb-6'>
        <div className='card-body'>
          <div className='flex items-center justify-between'>
            <h2 className='card-title'>Total</h2>
            <span className='text-2xl font-bold' data-testid='summary-total'>
              ${formatCents(totalCents)}
            </span>
          </div>
          <p className='text-sm text-gray-500'>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* By category */}
        <div className='card bg-base-100 shadow-xl'>
          <div className='card-body'>
            <h2 className='card-title'>By Category</h2>
            {categoryTotals.length === 0 ? (
              <p className='text-gray-500' data-testid='no-category-totals'>No data</p>
            ) : (
              <table className='table w-full' data-testid='category-totals-table'>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th className='text-right'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map((ct) => (
                    <tr key={ct.id} data-testid={`category-total-${ct.id}`}>
                      <td>{ct.name}</td>
                      <td>{ct.count}</td>
                      <td className='text-right'>${formatCents(ct.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* By tag */}
        <div className='card bg-base-100 shadow-xl'>
          <div className='card-body'>
            <h2 className='card-title'>By Tag</h2>
            {tagTotals.length === 0 ? (
              <p className='text-gray-500' data-testid='no-tag-totals'>No data</p>
            ) : (
              <table className='table w-full' data-testid='tag-totals-table'>
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Count</th>
                    <th className='text-right'>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tagTotals.map((tt) => (
                    <tr key={tt.id} data-testid={`tag-total-${tt.id}`}>
                      <td>{tt.name}</td>
                      <td>{tt.count}</td>
                      <td className='text-right'>${formatCents(tt.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Attach the summary route to the app.
 */
export const buildSummary = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES.SUMMARY,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const db = c.get('db') as DrizzleClient
      const categoryFilter = c.req.query('categoryId') ?? ''
      const tagFilter = c.req.query('tagId') ?? ''
      const dateFrom = c.req.query('dateFrom') ?? ''
      const dateTo = c.req.query('dateTo') ?? ''

      const [expensesResult, categoriesResult, tagsResult] = await Promise.all([
        getExpenses(db, {
          categoryId: categoryFilter || undefined,
          tagId: tagFilter || undefined,
        }),
        getAllCategories(db),
        getAllTags(db),
      ])

      let expenses = expensesResult.isOk ? expensesResult.value : []
      const categories = categoriesResult.isOk ? categoriesResult.value : []
      const tags = tagsResult.isOk ? tagsResult.value : []

      if (dateFrom) {
        expenses = expenses.filter((e) => e.date >= dateFrom)
      }
      if (dateTo) {
        expenses = expenses.filter((e) => e.date <= dateTo)
      }

      return c.render(
        useLayout(
          c,
          renderSummaryPage(expenses, categories, tags, categoryFilter, tagFilter, dateFrom, dateTo)
        )
      )
    }
  )
}
