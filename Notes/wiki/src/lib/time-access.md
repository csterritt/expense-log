# time-access.ts

**Source:** `src/lib/time-access.ts`

## Purpose

Time abstraction layer. In production, returns real `new Date()` values. In test/dev, reads a `delta` cookie to shift the clock forward or backward for deterministic rate-limiting and expiration tests.

## Exports

### `getCurrentTime(c, ...args): Date`

- **Production** — returns `new Date(...args)` (or `new Date()` if no args)
- **Test** — reads the `delta` cookie, parses it as an integer, and adds that offset to the current real time before constructing the `Date`

### `setCurrentDelta(c, delta): void`

Sets the `delta` cookie to the given number of milliseconds.

### `clearCurrentDelta(c): void`

Deletes the `delta` cookie.

## Cross-references

- [cookie-support.md](cookie-support.md) — `addCookie`, `removeCookie`, `retrieveCookie`
- [routes/auth/handle-set-clock.md](../routes/auth/handle-set-clock.md) — sets the delta via a test route
- [routes/auth/handle-reset-clock.md](../routes/auth/handle-reset-clock.md) — clears the delta

---

See [source-code.md](../../source-code.md) for the full catalog.
