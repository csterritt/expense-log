# src/routes/auth/handle-reset-clock.ts

Test-only route handler for resetting the simulated clock. Entire file stripped in production (`PRODUCTION:STOP`).

## Route Registered

- `GET /auth/reset-clock` — Clears the test time delta cookie

Calls `clearCurrentDelta(c)` to remove the time delta cookie, then redirects to root with "Clock reset!" message.

## Dependencies

- `../../lib/time-access` — `clearCurrentDelta`
- `../../lib/redirects` — `redirectWithMessage`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
