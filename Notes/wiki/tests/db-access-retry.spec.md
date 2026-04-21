# db-access-retry.spec.ts

**Source:** `tests/db-access-retry.spec.ts`

## Purpose

Tests the retry wrapper logic similar to what `db-access.ts` uses. Exercises `async-retry` with `true-myth` Result types.

## Key logic tested

### `withRetry(operationName, operation)`

- Returns success immediately when the operation succeeds on the first try
- Retries on `Result.err` and eventually succeeds after transient failures
- Returns `Result.err` after exhausting all retries (1 initial + 3 retries = 4 total calls)
- Retries on thrown exceptions (not just `Result.err`)
- Preserves the original error object after retries exhaust

## Dependencies

- `async-retry`
- `true-myth/result`

---

See [tests.md](../tests.md) for the full catalog.
