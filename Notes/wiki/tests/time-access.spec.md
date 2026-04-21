# time-access.spec.ts

**Source:** `tests/time-access.spec.ts`

## Purpose

Unit tests for `src/lib/time-access.ts` clock manipulation. Tests `getCurrentTime`, `setCurrentDelta`, and `clearCurrentDelta` using a fake Hono-like context object.

## Fake context (`makeFakeContext`)

Simulates cookie storage via a `Map`-backed `storage`. Mimics `c.req.raw.headers.get('Cookie')` and `c.header('Set-Cookie', ...)`.

## Test cases

- `getCurrentTime` with no delta returns approximately `new Date()`
- Past delta (`-50_000`) returns approximately `now - 50_000`
- Future delta (`+50_000`) returns approximately `now + 50_000`
- Delayed call after setting past delta still returns approximately `now - 50_000`
- Delayed call after setting future delta still returns approximately `now + 50_000`
- `getCurrentTime(c, futureDate)` with past delta computes correctly relative to the provided date
- `getCurrentTime(c, futureDate)` with future delta computes correctly relative to the provided date
- `clearCurrentDelta` restores normal time (no offset)

## Dependencies

- `src/lib/time-access`

---

See [tests.md](../tests.md) for the full catalog.
