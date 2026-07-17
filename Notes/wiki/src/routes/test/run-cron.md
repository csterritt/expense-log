# src/routes/test/run-cron.ts

Test-only route for manually triggering the recurring expense materialization cron job. Entire file stripped in production (`PRODUCTION:STOP`).

## Route Registered

- `POST /test/run-cron` — Manually trigger `materializeRecurring` (requires sign-in)

## Flow

1. Creates DB client from D1 binding
2. Gets today's ET date (respecting test time delta)
3. Calls `materializeRecurring(db, today)`
4. Returns JSON with `today`, `generated`, `skipped`, and `failed` counts
5. On error: returns 500 with error message

## Dependencies

- `../../db/client` — `createDbClient`
- `../../lib/db/expense-access` — `materializeRecurring`
- `../../lib/et-date` — `todayEt`
- `../../lib/time-access` — `getCurrentTime`
- `../../middleware/signed-in-access` — auth guard
- `../../constants` — `STANDARD_SECURE_HEADERS`
