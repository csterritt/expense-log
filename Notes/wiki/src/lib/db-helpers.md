# db-helpers.ts

**Source:** `src/lib/db-helpers.ts`

## Purpose

Shared database helper utilities: retry wrapper and Result converter. Extracted from the former `db-access.ts` so auth and expense modules can share the same patterns without a circular dependency.

## Exports

### `withRetry(operationName, operation): Promise<Result<T, Error>>`

Wraps an async operation in `async-retry` with `STANDARD_RETRY_OPTIONS`. If the returned `Result` is `Err`, the retry layer throws it so `async-retry` can back off and try again. After retries are exhausted, logs `final error` and returns `Result.err` with the final error. Preserves the original `Error` object.

### `toResult(fn): Promise<Result<T, Error>>`

Executes `fn` and wraps:

- Success → `Result.ok(await fn())`
- Thrown error → `Result.err(e instanceof Error ? e : new Error(String(e)))`

## Cross-references

- [constants.md](../constants.md) — `STANDARD_RETRY_OPTIONS`
- [src/lib/db/auth-access.md](auth-access.md) — uses `withRetry` + `toResult` for auth queries
- [src/lib/db/expense-access.md](expense-access.md) — uses `withRetry` for expense queries

---

See [source-code.md](../../source-code.md) for the full catalog.
