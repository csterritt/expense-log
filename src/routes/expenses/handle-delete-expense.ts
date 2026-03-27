/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for deleting an expense.
 * @module routes/expenses/handleDeleteExpense
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, EXPENSE_MESSAGES, MESSAGES } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { deleteExpense } from '../../lib/expense-db-access'

/**
 * Attach the delete expense handler to the app.
 */
export const handleDeleteExpense = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.EXPENSES.DELETE,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const id = c.req.param('id') ?? ''
        const db = c.get('db') as DrizzleClient

        const result = await deleteExpense(db, id)

        if (result.isErr) {
          console.error('Delete expense error:', result.error)
          return redirectWithError(c, PATHS.EXPENSES.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
        }

        if (!result.value) {
          return redirectWithError(c, PATHS.EXPENSES.LIST, EXPENSE_MESSAGES.EXPENSE_NOT_FOUND)
        }

        return redirectWithMessage(c, PATHS.EXPENSES.LIST, EXPENSE_MESSAGES.EXPENSE_DELETED)
      } catch (error) {
        console.error('Delete expense handler error:', error)
        return redirectWithError(c, PATHS.EXPENSES.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
      }
    }
  )
}
