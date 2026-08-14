# src/routes/expenses/expense-form-helpers.ts

Helper functions for expense form handling.

## Constants

### `EXPENSE_ADDED_OUTCOME: SubmissionOutcome`

The canonical success outcome for a committed expense create — the post-redirect-get target plus its flash message (`{ path: PATHS.EXPENSES, message: 'Expense added.' }`). Shared by the direct-create and confirm-create handlers so a replayed submit reproduces the same result via the [idempotency ledger](../../idempotency-ledger.md). Typed as `SubmissionOutcome` from `../../lib/submission-idempotency`.

## Functions

### emptyState(today): ExpenseFormState

Returns an empty form state with default values: empty description, amount, category, tags; date set to `today`.

### readRawBody(c): Promise\<RawBody\>

Parses form body and returns typed object with: `description`, `amount`, `date`, `category`, `tags`, `tagId` (string[]), `newTags`, `action`, `submissionKey`. Handles `tagId` as both single and multi-value field. `submissionKey` defaults to `''` when absent or non-string (Issue 19; see [Idempotency Ledger](../../idempotency-ledger.md)).

### requireUserId(c): string

Reads the signed-in user's id from the request context. Callers are behind the `signedInAccess` middleware, so `user` is guaranteed present. Used by the committing handlers to key `withIdempotency` off the signed-in `userId`.

## Dependencies

- `hono` — `Context`
- `../../local-types` — `Bindings`, `AuthUser`
- `../../constants` — `PATHS`
- `../../lib/submission-idempotency` — `SubmissionOutcome` (type only)
- `./expense-form` — `ExpenseFormState` type
