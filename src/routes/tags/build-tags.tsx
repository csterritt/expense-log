/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the tags management page.
 * @module routes/tags/buildTags
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { setupNoCacheHeaders } from '../../lib/setup-no-cache-headers'
import { getAllTags } from '../../lib/expense-db-access'
import type { Tag } from '../../db/schema'

// const tagNameMax = 100 // PRODUCTION:UNCOMMENT
const tagNameMax = 102

/**
 * Render the tags management page
 */
const renderTagsPage = (tags: Tag[]) => (
  <div data-testid='tags-page' className='w-full'>
    <div className='flex items-center justify-between mb-6'>
      <h1 className='text-2xl font-bold'>Tags</h1>
      <a
        href={PATHS.EXPENSES.LIST}
        className='btn btn-outline btn-sm'
        data-testid='back-to-expenses-action'
      >
        Back to Expenses
      </a>
    </div>

    {tags.length === 0 ? (
      <div className='card bg-base-100 shadow-xl'>
        <div className='card-body'>
          <p className='text-gray-500 text-center py-8' data-testid='no-tags-message'>
            No tags yet. Create one when adding an expense.
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
              {tags.map((t) => (
                <tr key={t.id} data-testid={`tag-row-${t.id}`}>
                  <td>
                    <form
                      method='post'
                      action={PATHS.TAGS.EDIT.replace(':id', t.id)}
                      className='flex gap-2 items-center'
                    >
                      <input
                        name='name'
                        type='text'
                        value={t.name}
                        required
                        maxLength={tagNameMax}
                        className='input input-bordered input-sm'
                        data-testid={`edit-tag-name-${t.id}`}
                      />
                      <button
                        type='submit'
                        className='btn btn-sm btn-primary'
                        data-testid={`update-tag-${t.id}`}
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td>
                    <form method='post' action={PATHS.TAGS.DELETE.replace(':id', t.id)}>
                      <button
                        type='submit'
                        className='btn btn-sm btn-error btn-outline'
                        data-testid={`delete-tag-${t.id}`}
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
 * Attach the tags list route to the app.
 */
export const buildTags = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.TAGS.LIST,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      setupNoCacheHeaders(c)

      const db = c.get('db') as DrizzleClient
      const tagsResult = await getAllTags(db)
      const tags = tagsResult.isOk ? tagsResult.value : []

      return c.render(useLayout(c, renderTagsPage(tags)))
    },
  )
}
