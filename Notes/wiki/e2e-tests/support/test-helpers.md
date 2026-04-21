# test-helpers.ts

**Source:** `e2e-tests/support/test-helpers.ts`

## Purpose

Test wrapper that provides database isolation for every Playwright test.

## Export

### `testWithDatabase(testFn): PlaywrightTestFunction`

Returns a wrapped test function that:

1. **Before** — calls `clearDatabase()`, `seedDatabase()`, `clearSessions()`
2. **Runs** the actual test
3. **After** (in `finally`) — calls `clearDatabase()` again

This ensures each test starts from a known clean state.

## Cross-references

- [db-helpers.md](db-helpers.md) — `clearDatabase`, `seedDatabase`, `clearSessions`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
