/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expenses list page.
 * @module routes/expenses/buildExpenses
 */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { ALLOW_SCRIPTS_SECURE_HEADERS, PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { handleExpensesGet } from './expense-get-handler'
import { handleExpensesPost } from './expense-post-handler'
import { handleExpensesConfirmPost } from './expense-confirm-post-handler'

const CONFIRM_CREATE_NEW_PATH = '/expenses/confirm-create-new'

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    handleExpensesGet,
  )

  app.post(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    handleExpensesPost,
  )

  app.post(
    CONFIRM_CREATE_NEW_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    handleExpensesConfirmPost,
  )
}
