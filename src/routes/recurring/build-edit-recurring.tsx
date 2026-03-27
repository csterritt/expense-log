/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the edit recurring expense page.
 * @module routes/recurring/buildEditRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import { redirectWithError } from '../../lib/redirects'
import { getRecurringExpenses, getAllCategories } from '../../lib/expense-db-access'
import type { RecurringExpense, Category } from '../../db/schema'

// const descriptionMax = 500 // PRODUCTION:UNCOMMENT
const descriptionMax = 502

// const categoryNameMax = 100 // PRODUCTION:UNCOMMENT
const categoryNameMax = 102

/**
 * Format cents as dollar string
 */
const formatCents = (cents: number): string => (cents / 100).toFixed(2)

/**
 * Render the edit recurring expense form
 */
const renderEditRecurring = (item: RecurringExpense, categories: Category[]) => {
  const actionUrl = PATHS.RECURRING.EDIT.replace(':id', item.id)

  return (
    <div data-testid='edit-recurring-page' className='flex justify-center'>
      <div className='card w-full max-w-2xl bg-base-100 shadow-xl'>
        <div className='card-body'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='card-title text-2xl font-bold'>Edit Recurring Expense</h2>
            <a
              href={PATHS.RECURRING.LIST}
              className='btn btn-outline btn-sm'
              data-testid='back-to-recurring-action'
            >
              Cancel
            </a>
          </div>

          <form method='post' action={actionUrl} className='flex flex-col gap-4'>
            <div className='flex flex-wrap gap-3'>
              <div className='form-control'>
                <label className='label' htmlFor='recurring-amount'>
                  <span className='label-text'>Amount ($)</span>
                </label>
                <input
                  id='recurring-amount'
                  name='amount'
                  type='number'
                  step='0.01'
                  min='0.01'
                  required
                  value={formatCents(item.amountCents)}
                  className='input input-bordered w-36'
                  data-testid='recurring-amount-input'
                />
              </div>

              <div className='form-control flex-1'>
                <label className='label' htmlFor='recurring-description'>
                  <span className='label-text'>Description</span>
                </label>
                <input
                  id='recurring-description'
                  name='description'
                  type='text'
                  required
                  maxLength={descriptionMax}
                  value={item.description}
                  className='input input-bordered w-full'
                  data-testid='recurring-description-input'
                />
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              <div className='form-control'>
                <label className='label' htmlFor='recurring-period'>
                  <span className='label-text'>Period</span>
                </label>
                <select
                  id='recurring-period'
                  name='period'
                  required
                  className='select select-bordered'
                  data-testid='recurring-period-select'
                >
                  <option value='daily' selected={item.period === 'daily'}>Daily</option>
                  <option value='weekly' selected={item.period === 'weekly'}>Weekly</option>
                  <option value='monthly' selected={item.period === 'monthly'}>Monthly</option>
                  <option value='yearly' selected={item.period === 'yearly'}>Yearly</option>
                </select>
              </div>

              <div className='form-control'>
                <label className='label' htmlFor='recurring-next-run'>
                  <span className='label-text'>Next Run Date</span>
                </label>
                <input
                  id='recurring-next-run'
                  name='nextRunDate'
                  type='date'
                  required
                  value={item.nextRunDate}
                  className='input input-bordered'
                  data-testid='recurring-next-run-input'
                />
              </div>
            </div>

            <div className='flex flex-wrap gap-3'>
              <div className='form-control'>
                <label className='label' htmlFor='recurring-category'>
                  <span className='label-text'>Category</span>
                </label>
                <select
                  id='recurring-category'
                  name='categoryId'
                  className='select select-bordered'
                  data-testid='recurring-category-select'
                >
                  <option value=''>— none —</option>
                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      selected={cat.id === item.categoryId}
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='form-control flex-1'>
                <label className='label' htmlFor='recurring-new-category'>
                  <span className='label-text'>Or new category</span>
                </label>
                <input
                  id='recurring-new-category'
                  name='newCategory'
                  type='text'
                  placeholder='Type to create new category'
                  maxLength={categoryNameMax}
                  className='input input-bordered'
                  data-testid='recurring-new-category-input'
                />
              </div>
            </div>

            <div className='card-actions justify-end mt-4'>
              <button
                type='submit'
                className='btn btn-primary'
                data-testid='update-recurring-action'
              >
                Update Recurring Expense
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * Attach the edit recurring GET route to the app.
 */
export const buildEditRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.RECURRING.EDIT,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const id = c.req.param('id') ?? ''
      const db = c.get('db') as DrizzleClient

      const [itemsResult, categoriesResult] = await Promise.all([
        getRecurringExpenses(db),
        getAllCategories(db),
      ])

      const items = itemsResult.isOk ? itemsResult.value : []
      const item = items.find((r) => r.id === id) ?? null

      if (!item) {
        return redirectWithError(c, PATHS.RECURRING.LIST, 'Recurring expense not found.')
      }

      const categories = categoriesResult.isOk ? categoriesResult.value : []

      return c.render(useLayout(c, renderEditRecurring(item, categories)))
    }
  )
}
