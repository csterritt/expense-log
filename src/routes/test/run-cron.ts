/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// PRODUCTION:REMOVE

/**
 * Development-only cron trigger route.
 * Allows manual triggering of the recurring-expense materialization job.
 * @module routes/test/run-cron
 */

import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { createDbClient } from '../../db/client'
import { materializeRecurring } from '../../lib/db/expense-access'
import { todayEt } from '../../lib/et-date'
import { getCurrentTime } from '../../lib/time-access'
import { signedInAccess } from '../../middleware/signed-in-access'
import { STANDARD_SECURE_HEADERS } from '../../constants'

// PRODUCTION:REMOVE
export const testRunCronRouter = new Hono<{ Bindings: { PROJECT_DB: D1Database } }>()

// PRODUCTION:REMOVE
testRunCronRouter.post(
  '/run-cron',
  secureHeaders(STANDARD_SECURE_HEADERS),
  signedInAccess,
  async (c) => {
    const db = createDbClient(c.env.PROJECT_DB)
    const today = todayEt(getCurrentTime(c))
    const result = await materializeRecurring(db, today)
    if (result.isErr) {
      return c.json({ error: result.error.message }, 500)
    }
    return c.json({
      today,
      generated: result.value.generated,
      skipped: result.value.skipped,
      failed: result.value.failed,
    })
  },
)
