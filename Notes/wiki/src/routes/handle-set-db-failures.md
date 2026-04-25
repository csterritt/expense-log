# handle-set-db-failures.ts

**Source:** `src/routes/handle-set-db-failures.ts`

## Purpose

Dev-only test route to simulate database failures for resilience testing. Uses cookies to count how many times a specific DB operation should fail before succeeding.

## Export

### `handleSetDbFailures(app): void`

Route: `GET /auth/set-db-failures/:name/:times`

- `:name` — operation name to simulate failures for
- `:times` — number of consecutive failures before success

Sets cookies:

- `DB_FAIL_COUNT_{name}` — current failure count
- `DB_FAIL_INCR_{name}` — max failures allowed

Returns JSON: `{ ok: true, name, times }`

Used by E2E tests to verify retry logic in `db-helpers.ts` and `db/auth-access.ts`.

## Cross-references

- [lib/db-helpers.md](../lib/db-helpers.md) — `withRetry` reads failure cookies
- [lib/db/auth-access.md](../lib/db/auth-access.md) — reads these cookies to simulate failures
- [lib/test-routes.md](../lib/test-routes.md) — enabled only in test/dev mode

---

See [source-code.md](../../source-code.md) for the full catalog.
