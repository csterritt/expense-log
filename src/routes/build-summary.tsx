/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'

export const buildSummary = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.SUMMARY,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c) => {
      return c.render(
        useLayout(
          c,
          <div data-testid='summary-page'>
            <h1 className='text-2xl font-bold mb-4'>Summary</h1>
            <p>Summary coming soon</p>
          </div>,
        ),
      )
    },
  )
}
