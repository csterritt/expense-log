/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the categories management page.
 * @module routes/categories/buildCategories
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import { getAllCategories } from '../../lib/expense-db-access'
import type { Category } from '../../db/schema'

// const categoryNameMax = 100 // PRODUCTION:UNCOMMENT
const categoryNameMax = 102

/**
 * Render the categories management page
 */
const renderCategoriesPage = (categories: Category[]) => (
  <div data-testid='categories-page' className='w-full'>
    <div className='flex items-center justify-between mb-6'>
      <h1 className='text-2xl font-bold'>Categories</h1>
      <a href={PATHS.EXPENSES.LIST} className='btn btn-outline btn-sm' data-testid='back-to-expenses-action'>
        Back to Expenses
      </a>
    </div>

    {categories.length === 0 ? (
      <div className='card bg-base-100 shadow-xl'>
        <div className='card-body'>
          <p className='text-gray-500 text-center py-8' data-testid='no-categories-message'>
            No categories yet. Create one when adding an expense.
          </p>
        </div>
      </div>
    ) : (
      <div className='card bg-base-100 shadow-xl'>
        <div className='card-body'>
          <table className='table w-full'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} data-testid={`category-row-${cat.id}`}>
                  <td>
                    <form
                      method='post'
                      action={PATHS.CATEGORIES.EDIT.replace(':id', cat.id)}
                      className='flex gap-2 items-center'
                    >
                      <input
                        name='name'
                        type='text'
                        value={cat.name}
                        required
                        maxLength={categoryNameMax}
                        className='input input-bordered input-sm'
                        data-testid={`edit-category-name-${cat.id}`}
                      />
                      <button
                        type='submit'
                        className='btn btn-sm btn-primary'
                        data-testid={`update-category-${cat.id}`}
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td>
                    <form
                      method='post'
                      action={PATHS.CATEGORIES.DELETE.replace(':id', cat.id)}
                    >
                      <button
                        type='submit'
                        className='btn btn-sm btn-error btn-outline'
                        data-testid={`delete-category-${cat.id}`}
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
)

/**
 * Attach the categories list route to the app.
 */
export const buildCategories = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.CATEGORIES.LIST,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const db = c.get('db') as DrizzleClient
      const categoriesResult = await getAllCategories(db)
      const categories = categoriesResult.isOk ? categoriesResult.value : []

      return c.render(useLayout(c, renderCategoriesPage(categories)))
    }
  )
}
