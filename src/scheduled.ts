/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createDbClient } from './db/client'
import { materializeRecurring } from './lib/db/expense-access'
import { todayEt } from './lib/et-date'
import { pushoverNotifyEnv } from './lib/po-notify'
import type { Bindings } from './local-types'
import type { DrizzleClient } from './local-types'
import type { MaterializeRecurringResult } from './lib/db/expense-access'
import type { Result } from 'true-myth'

type ScheduledDeps = {
  dbFactory: (d1: D1Database) => DrizzleClient
  materialize: (db: DrizzleClient, today: string) => Promise<Result<MaterializeRecurringResult, Error>>
  notify: (env: Bindings, message: string) => Promise<void>
}

export const createScheduled = (deps: ScheduledDeps) =>
  async (
    _event: ScheduledEvent,
    env: Bindings,
    _ctx: ExecutionContext,
  ): Promise<void> => {
    try {
      const db = deps.dbFactory(env.PROJECT_DB)
      const today = todayEt()
      const result = await deps.materialize(db, today)

      if (result.isErr) {
        const msg = result.error.message
        console.error(`scheduled: hard failure — ${msg}`)
        console.log(`scheduled: generated=0 skipped=0 failed=1`)
        await deps.notify(env, `Expense-log cron: hard failure — ${msg}`)
        return
      }

      const { generated, skipped, failed } = result.value
      console.log(`scheduled: generated=${generated} skipped=${skipped} failed=${failed.length}`)

      for (const entry of failed) {
        console.error(`scheduled: template failure recurringId=${entry.recurringId} error=${entry.error}`)
      }

      if (failed.length > 0) {
        await deps.notify(env, `Expense-log cron: ${failed.length} template failure(s)`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`scheduled: unexpected error — ${msg}`)
      await deps.notify(env, `Expense-log cron: hard failure — ${msg}`).catch(() => {})
    }
  }

export const scheduled = createScheduled({
  dbFactory: createDbClient,
  materialize: materializeRecurring,
  notify: pushoverNotifyEnv,
})
