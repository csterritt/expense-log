# src/lib/time-access.ts

Time management with test-mode delta support. Allows E2E tests to simulate different dates by setting a `delta` cookie.

## Functions

### getCurrentTime(c, ...args): Date

Returns current time as a `Date`. In production: returns `new Date()` (or `new Date(...args)` if args provided). In development: adds a `delta` cookie value (milliseconds) to the current time, enabling time travel for tests.

### setCurrentDelta(c, delta): void

Sets the `delta` cookie with the given millisecond offset. Test-only. (PRODUCTION:REMOVE)

### clearCurrentDelta(c): void

Removes the `delta` cookie. Test-only. (PRODUCTION:REMOVE)

## Dependencies

- `./cookie-support` — `addCookie`, `removeCookie`, `retrieveCookie` (PRODUCTION:REMOVE)
- `../local-types` — `Bindings`
