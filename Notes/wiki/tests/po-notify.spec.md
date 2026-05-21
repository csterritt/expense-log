# po-notify.spec.ts

**Source:** `tests/po-notify.spec.ts`

## Purpose

Unit tests for `pushoverNotifyEnv` from `src/lib/po-notify.ts` (Issue 15). Uses `spyOn(globalThis, 'fetch')` to stub the network; no real HTTP calls are made.

## Test cases

- `(a) is a no-op when PO_APP_ID is missing` — fetch not called
- `(a) is a no-op when PO_APP_ID is blank` — fetch not called when `PO_APP_ID` is whitespace only
- `(b) is a no-op when PO_USER_ID is missing` — fetch not called
- `(b) is a no-op when PO_USER_ID is blank` — fetch not called when `PO_USER_ID` is whitespace only
- `(c) calls fetch once with Pushover URL and correct JSON body when not development` — asserts `fetch` called exactly once with `https://api.pushover.net/1/messages.json`, body contains `token`, `user`, and `message`
- `(d) skips network call and logs preview in development` — `NODE_ENV='development'`; fetch not called; `console.log` captures preview containing the message
- `(e) swallows a thrown fetch rejection without re-throwing` — `fetch` rejects with network error; `pushoverNotifyEnv` resolves without throwing

## Test setup

- `spyOn(globalThis, 'fetch')` in `beforeEach`, restored in `afterEach`.
- `makeEnv()` helper builds a minimal `Bindings`-shaped object with `PO_APP_ID='test-app-id'`, `PO_USER_ID='test-user-id'`, `NODE_ENV='production'`.

## Dependencies

- `src/lib/po-notify`
- `src/local-types` (type only)

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
