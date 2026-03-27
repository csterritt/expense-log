/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the edit expense page.
 * @module routes/expenses/buildEditExpense
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, EXPENSE_MESSAGES } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import { redirectWithError } from '../../lib/redirects'
import { getExpenseById, getAllCategories } from '../../lib/expense-db-access'
import type { ExpenseWithDetails } from '../../lib/expense-db-access'
import type { Category } from '../../db/schema'

/**
 * Format cents as dollar string e.g. 1250 -> "12.50"
 */
const formatCents = (cents: number): string => (cents / 100).toFixed(2)

/**
 * Render the edit expense form
 */
const renderEditExpense = (
  expense: ExpenseWithDetails,
  categories: Category[]
) => {
  const actionUrl = PATHS.EXPENSES.EDIT.replace(':id', expense.id)
  const currentTagNames = expense.tags.map((t) => t.name).join(', ')

  return (
    <div data-testid='edit-expense-page' className='flex justify-center'>
      <div className='card w-full max-w-2xl bg-base-100 shadow-xl'>
        <div className='card-body'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='card-title text-2xl font-bold'>Edit Expense</h2>
            <a
              href={PATHS.EXPENSES.LIST}
              className='btn btn-outline btn-sm'
              data-testid='back-to-expenses-action'
            >
              Cancel
            </a>
          </div>

          <form method='post' action={actionUrl} className='flex flex-col gap-4'>
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
                  required
                  value={formatCents(expense.amountCents)}
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
                  value={expense.date}
                  className='input input-bordered'
                  data-testid='expense-date-input'
                />
              </div>
            </div>

            <div className='form-control'>
              <label className='label' htmlFor='expense-description'>
                <span className='label-text'>Description</span>
              </label>
              <input
                id='expense-description'
                name='description'
                type='text'
                required
                maxLength={502}
                value={expense.description}
                className='input input-bordered w-full'
                data-testid='expense-description-input'
              />
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
                    <option
                      key={cat.id}
                      value={cat.id}
                      selected={cat.id === expense.categoryId}
                    >
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
                value={currentTagNames}
                className='input input-bordered'
                data-testid='expense-tags-input'
              />
            </div>

            <div className='card-actions justify-end mt-4'>
              <button
                type='submit'
                className='btn btn-primary'
                data-testid='update-expense-action'
              >
                Update Expense
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * Attach the edit expense GET route to the app.
 */
export const buildEditExpense = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES.EDIT,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const id = c.req.param('id') ?? ''
      const db = c.get('db') as DrizzleClient

      const [expenseResult, categoriesResult] = await Promise.all([
        getExpenseById(db, id),
        getAllCategories(db),
      ])

      if (expenseResult.isErr || expenseResult.value === null) {
        return redirectWithError(
          c,
          PATHS.EXPENSES.LIST,
          EXPENSE_MESSAGES.EXPENSE_NOT_FOUND
        )
      }

      const categories = categoriesResult.isOk ? categoriesResult.value : []

      return c.render(
        useLayout(
          c,
          renderEditExpense(expenseResult.value, categories)
        )
      )
    }
  )
}
