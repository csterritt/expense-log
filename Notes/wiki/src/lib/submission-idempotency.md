# src/lib/submission-idempotency.ts

Submission idempotency backbone. `withIdempotency` records a committing mutation's server-generated `submissionKey` (a ULID) alongside the write and detects replays: a fresh, well-formed key runs the work and stores its outcome; a duplicate key short-circuits to the previously stored outcome without repeating the write; an absent or malformed key runs the work exactly once with no dedupe so a legitimate submit is never blocked.

HTTP-agnostic — accepts a drizzle client, not a Hono context — so the same helper is unit-testable against the test-DB harness and reusable across handlers. See the [Idempotency Ledger](../idempotency-ledger.md) concept page for the cross-cutting design and the list of handlers that use it.

## Constants

### `LEDGER_TTL_MS`

`24 * 60 * 60 * 1000` (~24 hours). Ledger rows older than this are pruned opportunistically so the table does not grow unbounded. A short window is enough because retries happen within seconds. Named at file level so it is easy to tune.

### `ULID_PATTERN`

`/^[0-9A-HJKMNP-TV-Z]{26}$/i` — Crockford base32 ULID (26 chars, excluding I, L, O, U), case-insensitive. Gates the dedupe path: only well-formed ULIDs are looked up in the ledger.

## Types

### `SubmissionOutcome`

The persisted result of a committing submission — enough to replay the original post-redirect-get:

- `path: string` — redirect target
- `message: string` — flash message

Serialized as JSON text in the `submissionKey.outcome` column.

### `WithIdempotencyArgs`

Arguments for `withIdempotency`:

- `key: string` — the submitted `submissionKey`
- `userId: string` — the signed-in user's id
- `run: () => Promise<Result<SubmissionOutcome, Error>>` — performs the mutation and returns the outcome to persist. Must return `Result.err` to signal a validation/commit failure, in which case no ledger row is recorded and the key remains resubmittable.

## Functions

### `withIdempotency(db, { key, userId, run }): Promise<Result<SubmissionOutcome, Error>>`

Runs `run` idempotently, keyed off `key` for `userId`. Four branches, walked in order:

1. **Absent / malformed key** (`!isValidSubmissionKey(key)`): runs `run` exactly once with no dedupe and never blocks a legitimate submit. No ledger row is recorded.
2. **Duplicate key** (a row already exists for `key`): returns the stored outcome via `parseOutcome` without re-running `run`. If the stored outcome is corrupt (`parseOutcome` returns `null`), falls through and re-runs the mutation.
3. **`run` returns `Result.err`**: records no ledger row; the key stays resubmittable so the user can retry with the same key.
4. **Fresh key (or unreadable ledger)**: runs `run`, and only on success inserts the ledger row (`key`, `userId`, `JSON.stringify(outcome)`, `createdAt`), then opportunistically prunes stale rows, and returns the outcome.

Transaction guarantee: `run` performs its write first, and only on success does the helper insert the ledger row — so the ledger row records a commit that already happened. A duplicate key short-circuits at the `select` before `run` is ever invoked.

### `pruneStaleLedgerRows(db): Promise<void>` (internal)

Best-effort prune of ledger rows older than `LEDGER_TTL_MS`. Runs opportunistically after every successful write. Uses `toResult` so any failure is converted to `Result.err` and swallowed with a `console.log` — a housekeeping problem can never turn a legitimate submission into a failure.

## Internal Helpers

- `isValidSubmissionKey(key): key is string` — type guard combining `typeof === 'string'` and `ULID_PATTERN.test`.
- `parseOutcome(raw): SubmissionOutcome | null` — defensively parses a stored `outcome` string. Returns `null` on a missing/malformed value so the helper falls through and re-runs the mutation rather than poisoning the submit.

## Dependencies

- `drizzle-orm` — `eq`, `lt`
- `true-myth` — `Result`
- `../db/schema` — `submissionKey`
- `../local-types` — `DrizzleClient`
- `./db-helpers` — `toResult`

## Consumers

- [expense-post-handler.ts](../routes/expenses/expense-post-handler.md) — direct-create path wraps `createExpenseWithTags`
- [expense-confirm-post-handler.ts](../routes/expenses/expense-confirm-post-handler.md) — confirm-create path wraps `createManyAndExpense`

## Tests

- [submission-idempotency.spec.ts](../unit-tests.md) — integration coverage for all four contract branches
