# handle-set-db-failures.ts

**Source:** `src/routes/handle-set-db-failures.ts`

## Purpose

Dev-only test route to simulate database failures for resilience testing. Uses cookies to count how many times a specific DB operation should fail before succeeding.

## Export

### `handleSetDbFailures(app): void`

Route: `GET /auth/set-db-failures/:name/:times`

- `:name` — cookie name to set; must be one of `COOKIES.DB_FAIL_COUNT` or `COOKIES.DB_FAIL_INCR` (validated against an allowlist)
- `:times` — value to store in the cookie (e.g. number of consecutive failures before success)

Sets the specified cookie to the given `:times` value, then redirects to `/` with `redirectWithMessage`.

Guarded by `PRODUCTION:STOP` / `PRODUCTION:UNCOMMENT` markers so the route body is stripped in production builds.

Used by E2E tests to verify retry logic in `db-helpers.ts` and `db/auth-access.ts`.

## Cross-references

- [lib/db-helpers.md](../lib/db-helpers.md) — `withRetry` reads failure cookies
- [lib/db/auth-access.md](../lib/db/auth-access.md) — reads these cookies to simulate failures
- [constants.md](../constants.md) — `COOKIES.DB_FAIL_COUNT`, `COOKIES.DB_FAIL_INCR`, `PATHS.AUTH.SET_DB_FAILURES`, `STANDARD_SECURE_HEADERS`

---

See [source-code.md](../../source-code.md) for the full catalog.
