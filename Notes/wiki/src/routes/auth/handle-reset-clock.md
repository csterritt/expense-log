# handle-reset-clock.ts

**Source:** `src/routes/auth/handle-reset-clock.ts`

## Purpose

Dev-only test route that clears the clock manipulation `delta` cookie, restoring normal time behavior.

## Export

### `handleResetClock(app): void`

Route: `GET /auth/reset-clock`

Calls `clearCurrentDelta(c)` and redirects to `/` with `'Clock reset!'`.


## Cross-references

- [../../lib/time-access.md](../../lib/time-access.md) — `clearCurrentDelta`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.RESET_CLOCK`, `PATHS.ROOT`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.

---

See [source-code.md](../../../source-code.md) for the full catalog.
