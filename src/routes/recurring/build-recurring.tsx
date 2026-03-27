/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the recurring expenses page.
 * @module routes/recurring/buildRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import { getRecurringExpenses, getAllCategories } from '../../lib/expense-db-access'
import type { RecurringExpense } from '../../db/schema'
import type { Category } from '../../db/schema'

// const descriptionMax = 500 // PRODUCTION:UNCOMMENT
const descriptionMax = 502

// const categoryNameMax = 100 // PRODUCTION:UNCOMMENT
const categoryNameMax = 102

/**
 * Format cents as dollar string e.g. 1250 -> "12.50"
 */
const formatCents = (cents: number): string => (cents / 100).toFixed(2)

/**
 * Render the create recurring expense form
 */
const renderRecurringForm = (categories: Category[]) => (
  <form method='post' action={PATHS.RECURRING.LIST} className='flex flex-col gap-3'>
    <h2 className='text-xl font-bold'>Add Recurring Expense</h2>
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
          placeholder='0.00'
          required
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
          placeholder='What is this recurring expense for?'
          required
          maxLength={descriptionMax}
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
          <option value=''>— select period —</option>
          <option value='daily'>Daily</option>
          <option value='weekly'>Weekly</option>
          <option value='monthly'>Monthly</option>
          <option value='yearly'>Yearly</option>
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
            <option key={cat.id} value={cat.id}>
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

    <div className='card-actions'>
      <button
        type='submit'
        className='btn btn-primary'
        data-testid='create-recurring-action'
      >
        Add Recurring Expense
      </button>
    </div>
  </form>
)

/**
 * Render the recurring expense list
 */
const renderRecurringList = (items: RecurringExpense[]) => (
  <div className='mt-8'>
    <h2 className='text-xl font-bold mb-4'>Recurring Expenses</h2>
    {items.length === 0 ? (
      <p className='text-gray-500 text-center py-8' data-testid='no-recurring-message'>
        No recurring expenses yet.
      </p>
    ) : (
      <table className='table table-zebra w-full'>
        <thead>
          <tr>
            <th>Description</th>
            <th className='text-right'>Amount</th>
            <th>Period</th>
            <th>Next Run</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} data-testid={`recurring-row-${item.id}`}>
              <td data-testid={`recurring-description-${item.id}`}>{item.description}</td>
              <td className='text-right' data-testid={`recurring-amount-${item.id}`}>
                ${formatCents(item.amountCents)}
              </td>
              <td data-testid={`recurring-period-${item.id}`}>{item.period}</td>
              <td data-testid={`recurring-next-run-${item.id}`}>{item.nextRunDate}</td>
              <td data-testid={`recurring-active-${item.id}`}>{item.isActive ? 'Yes' : 'No'}</td>
              <td className='flex gap-2'>
                <a
                  href={PATHS.RECURRING.EDIT.replace(':id', item.id)}
                  className='btn btn-xs btn-outline'
                  data-testid={`edit-recurring-${item.id}`}
                >
                  Edit
                </a>
                <form method='post' action={PATHS.RECURRING.DELETE.replace(':id', item.id)}>
                  <button
                    type='submit'
                    className='btn btn-xs btn-error btn-outline'
                    data-testid={`delete-recurring-${item.id}`}
                  >
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)

/**
 * Attach the recurring expenses list route to the app.
 */
export const buildRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.RECURRING.LIST,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const db = c.get('db') as DrizzleClient
      const [itemsResult, categoriesResult] = await Promise.all([
        getRecurringExpenses(db),
        getAllCategories(db),
      ])

      const items = itemsResult.isOk ? itemsResult.value : []
      const categories = categoriesResult.isOk ? categoriesResult.value : []

      return c.render(
        useLayout(
          c,
          <div data-testid='recurring-page' className='w-full'>
            <div className='flex items-center justify-between mb-6'>
              <h1 className='text-2xl font-bold'>Recurring Expenses</h1>
              <a
                href={PATHS.EXPENSES.LIST}
                className='btn btn-outline btn-sm'
                data-testid='back-to-expenses-action'
              >
                Back to Expenses
              </a>
            </div>
            <div className='card bg-base-100 shadow-xl mb-6'>
              <div className='card-body'>
                {renderRecurringForm(categories)}
              </div>
            </div>
            {renderRecurringList(items)}
          </div>
        )
      )
    }
  )
}
