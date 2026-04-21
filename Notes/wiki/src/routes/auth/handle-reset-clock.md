# handle-reset-clock.ts

**Source:** `src/routes/auth/handle-reset-clock.ts`

## Purpose

Dev-only test route that clears the clock manipulation `delta` cookie, restoring normal time behavior.

## Export

### `handleResetClock(app): void`

Route: `GET /auth/reset-clock`

Calls `clearCurrentDelta` and returns JSON: `{ ok: true }`

## Cross-references

- [lib/time-access.md](../../lib/time-access.md) — `clearCurrentDelta`

---

See [source-code.md](../../../source-code.md) for the full catalog.
