/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expenses list page.
 * @module routes/expenses/buildExpenses
 */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'

const renderExpenses = () => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      <p className='text-gray-600' data-testid='expenses-empty-state'>
        No expenses yet
      </p>
    </div>
  )
}

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(PATHS.EXPENSES, secureHeaders(STANDARD_SECURE_HEADERS), signedInAccess, (c) =>
    c.render(useLayout(c, renderExpenses())),
  )
}
