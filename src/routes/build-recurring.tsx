/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the recurring placeholder page.
 * @module routes/buildRecurring
 */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'

const renderRecurring = () => {
  return (
    <div data-testid='recurring-page'>
      <h1 className='text-2xl font-bold mb-4'>Recurring</h1>
      <p className='text-gray-600'>Recurring expense templates are coming soon.</p>
    </div>
  )
}

export const buildRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(PATHS.RECURRING, secureHeaders(STANDARD_SECURE_HEADERS), signedInAccess, (c) =>
    c.render(useLayout(c, renderRecurring())),
  )
}
