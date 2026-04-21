# handle-set-clock.ts

**Source:** `src/routes/auth/handle-set-clock.ts`

## Purpose

Dev-only test route that manipulates the server clock by setting a `delta` cookie. Used by E2E tests to trigger rate-limiting and expiration scenarios.

## Export

### `handleSetClock(app): void`

Route: `GET /auth/set-clock/:delta`

- `:delta` — milliseconds to shift the clock forward (positive) or backward (negative)

Sets the `delta` cookie via `setCurrentDelta` and returns JSON: `{ ok: true, delta }`

## Cross-references

- [lib/time-access.md](../../lib/time-access.md) — `setCurrentDelta`

---

See [source-code.md](../../../source-code.md) for the full catalog.
