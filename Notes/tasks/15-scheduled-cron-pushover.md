# Tasks for #15: Scheduled cron wiring + Pushover failure reporting

Parent issue: `Notes/issues/15-scheduled-cron-pushover.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Extract a context-free Pushover sender

**Type**: WRITE
**Output**: `src/lib/po-notify.ts` exports a new helper `pushoverNotifyEnv(env: Bindings, message: string): Promise<void>` that mirrors the existing `pushoverNotify` behaviour but accepts the raw `Bindings` env directly (so it is callable from a scheduled handler where there is no Hono `Context`). The existing `pushoverNotify(c, message)` is refactored to delegate to `pushoverNotifyEnv(c.env, message)` — no behaviour change for the existing fetch path. Both functions read `PO_APP_ID` / `PO_USER_ID` from env, short-circuit when either is missing or blank, suppress non-production sends with the same `console.log` preview, and swallow fetch errors with the same `console.log('pushoverNotify final error:', err)` shape.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Keep the new export HTTP-agnostic — no Hono types in its signature. Do not touch `local-types.ts` unless `Bindings` already exposes `PO_APP_ID` / `PO_USER_ID` (it should — verify, do not duplicate).

---

### 2. Unit tests for `pushoverNotifyEnv`

**Type**: TEST
**Output**: `tests/po-notify.spec.ts` (new file, or extend an existing po-notify spec if one already exists) covers `pushoverNotifyEnv` with a stubbed global `fetch`: (a) no-op when `PO_APP_ID` is missing/blank; (b) no-op when `PO_USER_ID` is missing/blank; (c) in `NODE_ENV !== 'development'` and both env values present, calls `fetch` once with the Pushover URL and a JSON body containing `token`, `user`, and `message`; (d) in `NODE_ENV === 'development'` skips the network call and logs the preview; (e) swallows a thrown `fetch` rejection without re-throwing.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the existing vitest harness and `vi.spyOn(globalThis, 'fetch')` (or equivalent) — no real network. Do not assert on the existing Hono-context-based `pushoverNotify` here.

---

### 3. Create `src/scheduled.ts` handler

**Type**: WRITE
**Output**: New file `src/scheduled.ts` exporting `scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void>`. The handler:

1. Builds a DB client via `createDbClient(env.PROJECT_DB)` (same pattern as the per-request middleware in `src/index.ts`).
2. Computes `today = todayEt()` (no clock delta — production has no cookie).
3. Calls `materializeRecurring(db, today)`.
4. Logs the outcome with `console.log` in a structured single-line shape: `scheduled: generated=<n> skipped=<n> failed=<n>` (one line per invocation), plus one `console.error` per entry in the `failed` array with the `recurringId` and friendly error message.
5. If the result is an `err` Result OR the inner summary has `failed.length > 0`, calls `pushoverNotifyEnv(env, <message>)` with a short message summarising the failure (`Expense-log cron: N template failure(s)` for the aggregated case; `Expense-log cron: hard failure — <msg>` for the outer err).
6. Wraps the whole body in a single `try/catch` so any unexpected throw is logged via `console.error` and also sent through `pushoverNotifyEnv` (best-effort), then swallowed — the scheduled handler must not throw past the Workers runtime.

**Depends on**: 1, Issue 14 task 6


---

### 4. Wire `scheduled` export in `src/index.ts`

**Type**: WRITE
**Output**: `src/index.ts` imports `scheduled` from `./scheduled` and exports it alongside the existing `export default app`. The cleanest shape is to replace the bare `export default app` with `export default { fetch: app.fetch, scheduled }` (or equivalent) so a single default export carries both handlers, matching Cloudflare Workers' module-worker contract. No other route wiring changes.
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Verify locally that the existing `fetch` path still resolves (the `app.fetch` binding must be reachable from the default export shape used).

---

### 5. Unit tests for `src/scheduled.ts`

**Type**: TEST
**Output**: `tests/scheduled.spec.ts` (new) mocks `materializeRecurring` (via `vi.mock('../src/lib/db/expense-access', ...)` or equivalent path) and `pushoverNotifyEnv`, then asserts:

1. The handler invokes `materializeRecurring` with `(db, todayEt())` exactly once.
2. When the mocked result is `ok({ generated: N, skipped: M, failed: [] })`, `pushoverNotifyEnv` is NOT called.
3. When the result contains `failed.length > 0` AND `PO_APP_ID` / `PO_USER_ID` are set on the mock env, `pushoverNotifyEnv` is called once with a message containing the failure count.
4. When the result is `err(...)`, `pushoverNotifyEnv` is called once with a message containing the error text.
5. When `materializeRecurring` throws synchronously, the handler does not re-throw and `pushoverNotifyEnv` is called once.
6. `createDbClient` receives `env.PROJECT_DB`.

**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Mock the DB client factory and the `materializeRecurring` export — do not stand up a real D1. Use the existing vitest patterns from `tests/expense-access.spec.ts` as a structural reference (without its DB harness).

---

### 6. Add `triggers.crons` to `wrangler.jsonc`

**Type**: CONFIG
**Output**: `wrangler.jsonc` gains a top-level `"triggers": { "crons": ["0 5 * * *"] }` block (05:00 UTC, year-round, no DST). Placement is consistent with the surrounding JSONC structure; the existing fields (`name`, `main`, `compatibility_date`, `d1_databases`, etc.) are unchanged. No other config changes.
**Depends on**: 4

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. JSONC comments allowed but not required — match the file's existing comment style. Do not introduce a duplicate `vars` block.

---

### 7. Manual verification pass

**Type**: REVIEW
**Output**: User runs `wrangler dev`, hits the local `/__scheduled` endpoint (or equivalent `wrangler dev --test-scheduled`), confirms log lines with `generated`/`skipped`/`failed` counts. User force-injects a failure (temporary throw inside `materializeRecurring`), sets test `PO_APP_ID` / `PO_USER_ID`, re-runs, confirms a Pushover send fires and the error is logged. User runs the scheduled handler twice in succession and confirms zero duplicates via `/expenses`. User inspects `wrangler.jsonc` and confirms `triggers.crons` is `["0 5 * * *"]`.
**Depends on**: 6

---

### 8. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `src/scheduled.ts` entry point and its summary-logging + Pushover-on-failure contract; the new `pushoverNotifyEnv` context-free helper; the production cron schedule (`0 5 * * *` UTC); the relationship to Issue 14's `materializeRecurring` and the dev-only `POST /test/run-cron` route. Update `Notes/wiki/index.md` and append one `## [YYYY-MM-DD] ingest | Issue 15: scheduled cron + Pushover failure reporting` entry to `log.md`.
**Depends on**: 7

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link to Issue 14 (materialization engine) and the PRD sections _Cron trigger_, _Failure reporting_, and _Idempotency_.

---

### 9. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/15-scheduled-cron-pushover/code-walkthrough/` covering: `src/scheduled.ts` (DB client build, `todayEt()`, `materializeRecurring` call, summary log, failure-branch Pushover); the `pushoverNotifyEnv` refactor and its delegation from the Hono-context `pushoverNotify`; the `src/index.ts` default-export shape carrying both `fetch` and `scheduled`; the `triggers.crons` entry in `wrangler.jsonc`.
**Depends on**: 8

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 10. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 9

---
