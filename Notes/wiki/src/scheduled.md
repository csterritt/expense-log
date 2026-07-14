# scheduled.ts

**Source:** `src/scheduled.ts`

## Purpose

Cloudflare Workers scheduled handler (Issue 15). Wires `materializeRecurring` into the production cron trigger and reports failures via Pushover. Registered as the `scheduled` export alongside the `fetch` handler in `src/index.ts`.

## Exports

### `scheduled(event, env, ctx): Promise<void>`

The real production entry point built from `createScheduled` with the real `createDbClient`, `materializeRecurring`, and `pushoverNotifyEnv` deps.

### `createScheduled(deps): ScheduledHandler`

Factory that accepts injected dependencies (`dbFactory`, `materialize`, `notify`) and returns the handler closure. Used by unit tests to inject mocks without `mock.module`.

## Handler behaviour

1. Calls `deps.dbFactory(env.PROJECT_DB)` to get a DB client.
2. Calls `todayEt()` (no cookie / clock delta — production cron has no request context).
3. Calls `deps.materialize(db, today)`.
4. **Happy path** (`ok`, `failed.length === 0`): logs `scheduled: generated=N skipped=N failed=0`.
5. **Partial failures** (`ok`, `failed.length > 0`): logs the summary plus one `console.error` per failed template (`recurringId` + `error`); calls `deps.notify(env, 'Expense-log cron: N template failure(s)')`.
6. **Hard failure** (`err` Result): logs the error; calls `deps.notify(env, 'Expense-log cron: hard failure — <msg>')`.
7. **Unexpected throw**: the entire body is wrapped in `try/catch`; unexpected errors are logged and forwarded to `deps.notify` best-effort, then swallowed — the handler never throws past the Workers runtime.

## Cron schedule

`0 5 * * *` UTC (05:00 UTC year-round, no DST adjustment) — configured in `wrangler.jsonc` via `"triggers": { "crons": ["0 5 * * *"] }`.

## Cross-references

- [po-notify.md](lib/po-notify.md) — `pushoverNotifyEnv` used for failure notifications
- [lib/db/expense-access.md](lib/db/expense-access.md) — `materializeRecurring` and `MaterializeRecurringResult`
- [lib/et-date.md](lib/et-date.md) — `todayEt()`
- [index.md](index.md) — wired as `export default { fetch: app.fetch, scheduled }`
- [src/routes/test/run-cron.md](routes/test/run-cron.md) — Issue 14 dev-only `POST /test/run-cron` (same underlying function, different entry point)

---

See [source-code.md](../../source-code.md) for the full catalog.
