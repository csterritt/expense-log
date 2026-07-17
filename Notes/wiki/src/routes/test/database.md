# src/routes/test/database.ts

Test-only database manipulation endpoints. Entire file stripped in production (`PRODUCTION:STOP`).

## Routes Registered

All under `/test/database`:

- `DELETE /clear` — Clear all data from all tables (respects FK order)
- `POST /seed` — Seed test data (users, categories, tags, expenses, recurring)
- `GET /users` — List all users
- `GET /expenses` — List all expenses
- `POST /clear-rate-limit-cache` — Clear the in-memory email rate limit cache

## Key Features

- Uses `runDb` helper that wraps operations in `toResult` and throws on error
- Imports `emailRateLimitCache` from `handle-forgot-password` for cache clearing
- All operations use `createDbClient` from the D1 binding

## Dependencies

- `../../db/client` — `createDbClient`
- `../../db/schema` — all table definitions
- `../../lib/db/expense-access` — `getRecurringById`
- `../../lib/db-helpers` — `toResult`
- `../../constants` — `STANDARD_SECURE_HEADERS`
- `../auth/handle-forgot-password` — `emailRateLimitCache`
- `ulid` — ID generation for seed data
