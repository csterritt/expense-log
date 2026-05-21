# Issue 15: Scheduled Cron + Pushover Failure Reporting — Code Walkthrough

*2026-05-21T12:49:58Z by Showboat 0.6.1*
<!-- showboat-id: 3e2db7e0-3bdd-4b5d-96ee-b131c8cd8d46 -->

## Overview

Issue 15 wires the recurring-expense materialization engine (Issue 14) into a real Cloudflare Workers cron trigger and adds Pushover failure reporting. The change touches four areas:

1. src/lib/po-notify.ts — context-free Pushover helper (pushoverNotifyEnv)
2. src/scheduled.ts — new scheduled handler entry point
3. src/index.ts — default export carries both fetch and scheduled
4. wrangler.jsonc — triggers.crons entry

## 1. pushoverNotifyEnv refactor — src/lib/po-notify.ts

The existing pushoverNotify(c, message) accepted a Hono Context, making it unusable from a scheduled handler (no request context available). Issue 15 extracts the core logic into a new pushoverNotifyEnv(env: Bindings, message) that accepts the raw Bindings env, then has pushoverNotify delegate to it.

Key points:
- pushoverNotifyEnv is HTTP-agnostic: no Hono types in its signature
- Both PO_APP_ID and PO_USER_ID are trimmed; either missing/blank = no-op
- NODE_ENV === 'development' suppresses the network call and logs a preview
- All fetch errors are swallowed with console.log('pushoverNotify final error:', err)
- pushoverNotify(c, message) is now a one-liner: await pushoverNotifyEnv(c.env, message)

```bash
cat src/lib/po-notify.ts
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Context } from 'hono'

import { API_URLS } from '../constants'
import type { Bindings, PushoverMessage } from '../local-types'

type AppContext = Context<{ Bindings: Bindings }>

const post = async (url: string, data: PushoverMessage): Promise<Response> => {
  /**
   * gatherResponse awaits and returns a response body as a string.
   * Use await gatherResponse(...) in an async function to get the response body
   * @param {Response} response
   */
  const gatherResponse = async (response: Response): Promise<string> => {
    const { headers } = response
    const contentType = headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return JSON.stringify(await response.json())
    } else if (contentType.includes('application/text')) {
      return response.text()
    } else if (contentType.includes('text/html')) {
      return response.text()
    } else {
      return response.text()
    }
  }

  const init = {
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  }
  const response = await fetch(url, init)
  const results = await gatherResponse(response)
  return new Response(results, init)
}

export const pushoverNotifyEnv = async (env: Bindings, message: string): Promise<void> => {
  const appId = env.PO_APP_ID?.trim()
  const userId = env.PO_USER_ID?.trim()

  if (appId && userId) {
    const msg: PushoverMessage = {
      token: appId,
      user: userId,
      message,
    }

    try {
      if (env.NODE_ENV !== 'development') {
        await post(API_URLS.PUSHOVER, msg)
      } else {
        console.log(`========> Notify would have been sent in production:`)
        console.log(`========> ${message}`)
      }
    } catch (err) {
      console.log(`pushoverNotify final error:`, err)
    }
  }
}

export const pushoverNotify = async (c: AppContext, message: string): Promise<void> => {
  await pushoverNotifyEnv(c.env, message)
}
```

## 2. src/scheduled.ts — the cron handler

The handler is built around a createScheduled(deps) factory pattern. This keeps the production scheduled export clean while allowing tests to inject mocks without touching the module registry (no mock.module needed).

### createScheduled(deps)

Accepts three dependencies:
- dbFactory(d1): DrizzleClient — wraps createDbClient
- materialize(db, today): Promise<Result<MaterializeRecurringResult, Error>> — wraps materializeRecurring  
- notify(env, message): Promise<void> — wraps pushoverNotifyEnv

### Handler logic (in order)

1. Build DB client: deps.dbFactory(env.PROJECT_DB)
2. Compute today: todayEt() — no clock delta, no cookie, production cron has no request context
3. Call deps.materialize(db, today)
4. If result.isErr: console.error the message, log counts as 0/0/1, call deps.notify with 'hard failure' message, return
5. If result.value.failed.length > 0: log summary, console.error per failed template, call deps.notify with N template failure(s) message
6. Happy path: log summary only, no notify
7. Outer try/catch: unexpected throws are logged and forwarded to deps.notify best-effort, then swallowed

### Production export

export const scheduled = createScheduled({ dbFactory: createDbClient, materialize: materializeRecurring, notify: pushoverNotifyEnv })

```bash
cat src/scheduled.ts
```

```output
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
```

## 3. src/index.ts — module-worker export shape

Cloudflare Workers' module-worker contract requires the default export to be an object with a fetch property (and optionally scheduled, queue, etc.). Previously the default export was just the Hono app instance. Issue 15 changes this to:

  export default { fetch: app.fetch, scheduled }

app.fetch is the Hono request handler. scheduled is the cron handler from src/scheduled.ts. This is the minimum change required to register both handlers with the Workers runtime while keeping all existing route logic untouched.

```bash
grep -n 'scheduled\|export default' src/index.ts | tail -5
```

```output
62:import { scheduled } from './scheduled'
239:export default { fetch: app.fetch, scheduled }
```

## 4. wrangler.jsonc — triggers.crons

The cron schedule is declared in wrangler.jsonc under triggers.crons. The value '0 5 * * *' means 05:00 UTC every day, year-round — no DST adjustment (the PRD specifies UTC anchoring). This is the standard Cloudflare cron trigger configuration.

```bash
grep -A3 'triggers' wrangler.jsonc
```

```output
  "triggers": {
    "crons": ["0 5 * * *"],
  },
  /**
```

## 5. Unit test verification

All 336 unit tests pass (12 spec files total). The two new spec files contribute 13 tests (7 for pushoverNotifyEnv, 6 for the scheduled handler).

```bash
cd tests && bun test 2>&1 | tail -5
```

```output
(pass) getCurrentTime function > should allow resetting the time properly [0.07ms]

 336 pass
 0 fail
Ran 336 tests across 12 files. [11.23s]
```
