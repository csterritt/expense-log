# src/routes/test/run-cron.ts

Dev-only (`// PRODUCTION:STOP`) cron trigger route.

## Purpose

Exposes `POST /test/run-cron` so Playwright e2e tests (and manual dev
usage) can trigger the recurring-expense materialization job on demand,
using the current test-clock date derived from the browser's delta
cookie.

## Behaviour

1. Creates a Drizzle DB client from `c.env.PROJECT_DB`.
2. Computes `today` as `todayEt(getCurrentTime(c))` — the test-clock
   delta cookie is honoured, so advancing the clock with `/auth/set-clock/:delta`
   before calling this route is the standard e2e test pattern.
3. Calls `materializeRecurring(db, today)`.
4. Returns JSON `{ today, generated, skipped, failed }` on success or
   `{ error }` with HTTP 500 on failure.

## Guards

- Guarded by `// PRODUCTION:STOP` / `// PRODUCTION:UNCOMMENT` markers so the route body is stripped in production builds.
- Requires an active session via `signedInAccess` middleware.
- Uses `secureHeaders(STANDARD_SECURE_HEADERS)`.

## Registration

```
app.route('/test', testRunCronRouter)  // PRODUCTION:REMOVE
```

## Cross-references

- [../../lib/recurrence.md](../../lib/recurrence.md) — `occurrencesToGenerate` algorithm
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `materializeRecurring`
- [../../lib/et-date.md](../../lib/et-date.md) — `todayEt`
- [../../lib/time-access.md](../../lib/time-access.md) — `getCurrentTime`
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate
- [../../constants.md](../../constants.md) — `STANDARD_SECURE_HEADERS`
- [../../db/client.md](../../db/client.md) — `createDbClient`
- [../../../e2e-tests/recurring/05-cron-28th-shift.spec.md](../../../e2e-tests/recurring/05-cron-28th-shift.spec.md)
- [../../../e2e-tests/recurring/06-cron-idempotency.spec.md](../../../e2e-tests/recurring/06-cron-idempotency.spec.md)
