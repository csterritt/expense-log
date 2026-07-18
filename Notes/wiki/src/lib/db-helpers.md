# src/lib/db-helpers.ts

Generic database helper utilities providing retry logic and Result-type wrapping.

## Functions

### withRetry\<T\>(operationName, operation): Promise\<Result\<T, Error\>\>

Wraps a `Result`-returning async operation with retry logic using `async-retry`. If the operation returns an error Result, it throws to trigger retry. After exhausting retries, returns the error as `Result.err`.

Uses `STANDARD_RETRY_OPTIONS` from constants (5 retries, 20ms min timeout in dev / 200ms in prod).

### toResult\<T\>(fn): Promise\<Result\<T, Error\>\>

Wraps a throwing async function into a `true-myth` Result. Returns `Result.ok` on success, `Result.err` on thrown error.

## Dependencies

- `async-retry` — retry library
- `true-myth/result` — Result type
- `../constants` — `STANDARD_RETRY_OPTIONS`
