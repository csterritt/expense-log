# expense-access.spec.ts

**Source:** `tests/expense-access.spec.ts`

## Purpose

Isolated unit tests for the `listTags` export contract from `src/lib/db/expense-access.ts`. Because the project does not yet have an in-process D1 harness for unit tests, this spec focuses on the function signature and return-type contract rather than query correctness (which is covered end-to-end by the E2E suite).

## Setup

- Uses `bun:test` (`describe`, `it`, `expect`).
- Imports `listTags` from `src/lib/db/expense-access.ts`.

## Test cases

### `listTags is exported and returns a Promise<Result<TagRow[], Error>>`

- Verifies that `listTags` is a function.
- Verifies that calling it with a mock `DrizzleClient` returns a `Promise`.
- The resolved shape (`Ok` with `TagRow[]` vs `Err` with `Error`) is exercised by the E2E suite via the real database.

## Cross-references

- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — the source module under test.
