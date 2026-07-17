# src/routes/auth/handle-set-clock.ts

Test-only route handler for setting the simulated clock. Entire file stripped in production (`PRODUCTION:STOP`).

## Route Registered

- `GET /auth/set-clock/:delta` — Sets the test time delta cookie

Parses `delta` from URL param, calls `setCurrentDelta(c, delta)` to store the time delta in a cookie, then redirects to root with "Clock set!" message.

## Dependencies

- `../../lib/time-access` — `setCurrentDelta`
- `../../lib/redirects` — `redirectWithMessage`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
