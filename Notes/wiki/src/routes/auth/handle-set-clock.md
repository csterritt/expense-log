# handle-set-clock.ts

**Source:** `src/routes/auth/handle-set-clock.ts`

## Purpose

Dev-only test route that manipulates the server clock by setting a `delta` cookie. Used by E2E tests to trigger rate-limiting and expiration scenarios.

## Export

### `handleSetClock(app): void`

Route: `GET /auth/set-clock/:delta`

- `:delta` — milliseconds to shift the clock forward (positive) or backward (negative), parsed via `parseInt`.

Calls `setCurrentDelta(c, delta)` and redirects to `/` with `'Clock set!'`.


## Cross-references

- [../../lib/time-access.md](../../lib/time-access.md) — `setCurrentDelta`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.SET_CLOCK`, `PATHS.ROOT`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.
- [handle-reset-clock.md](handle-reset-clock.md) — companion route to clear the delta.

---

See [source-code.md](../../../source-code.md) for the full catalog.
