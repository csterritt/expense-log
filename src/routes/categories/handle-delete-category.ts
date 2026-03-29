/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for deleting a category.
 * @module routes/categories/handleDeleteCategory
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, EXPENSE_MESSAGES, MESSAGES } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { deleteCategory } from '../../lib/expense-db-access'

/**
 * Attach the delete category handler to the app.
 */
export const handleDeleteCategory = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.CATEGORIES.DELETE,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const id = c.req.param('id') ?? ''
        const db = c.get('db') as DrizzleClient

        const result = await deleteCategory(db, id)

        if (result.isErr) {
          console.error('Delete category error:', result.error)
          return redirectWithError(c, PATHS.CATEGORIES.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
        }

        if (!result.value) {
          return redirectWithError(c, PATHS.CATEGORIES.LIST, 'Category not found.')
        }

        return redirectWithMessage(c, PATHS.CATEGORIES.LIST, EXPENSE_MESSAGES.CATEGORY_DELETED)
      } catch (error) {
        console.error('Delete category handler error:', error)
        return redirectWithError(c, PATHS.CATEGORIES.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
      }
    },
  )
}
