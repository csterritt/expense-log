/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the summary placeholder page.
 * @module routes/buildSummary
 */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'

const renderSummary = () => {
  return (
    <div data-testid='summary-page'>
      <h1 className='text-2xl font-bold mb-4'>Summary</h1>
      <p className='text-gray-600'>Expense summaries are coming soon.</p>
    </div>
  )
}

export const buildSummary = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(PATHS.SUMMARY, secureHeaders(STANDARD_SECURE_HEADERS), signedInAccess, (c) =>
    c.render(useLayout(c, renderSummary())),
  )
}
