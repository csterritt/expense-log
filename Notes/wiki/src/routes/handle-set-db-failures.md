# src/routes/handle-set-db-failures.ts

Test-only route handler for simulating DB failures. Entire file stripped in production (`PRODUCTION:STOP`).

## Routes Registered

- `GET /auth/set-db-failures/:name/:times` — Sets a cookie to simulate DB failures

## Parameters

- `name` — Must be `DB_FAIL_COUNT` or `DB_FAIL_INCR` (validated against allowed set)
- `times` — Numeric value for the failure count/increment

Sets the named cookie to the times value, then redirects to root.

## Dependencies

- `../constants` — `COOKIES`, `PATHS`, `STANDARD_SECURE_HEADERS`
- `../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../lib/cookie-support` — `addCookie`
