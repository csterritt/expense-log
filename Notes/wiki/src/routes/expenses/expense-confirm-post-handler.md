# src/routes/expenses/expense-confirm-post-handler.ts

POST handler for expense creation confirmation (when new categories/tags are involved).

## Functions

### handleExpensesConfirmPost(c): Promise\<Response\>

1. If `action === 'cancel'`: redirects back to expenses with form values preserved (no errors)
2. Re-validates all fields defensively (hidden inputs could be tampered)
3. Calls `resolveConfirmTagsAndCategory` to resolve tag/category state
4. On resolution failure: redirects with appropriate error
5. On success: routes the commit through [`withIdempotency`](../../lib/submission-idempotency.md) (keyed off `raw.submissionKey` + `requireUserId(c)`) wrapping `createManyAndExpense`, which atomically creates new category + new tags + expense + tag links; on success redirects with `EXPENSE_ADDED_OUTCOME`
6. On DB error: redirects with field-specific error (`category` when a new category was involved, `tags` otherwise)
7. On success: redirects with "Expense added." message

## Idempotency

The commit (step 5) is wrapped in `withIdempotency`. The confirm form's hidden `submissionKey` is the original one minted on the entry GET, so a replay of either the entry POST or the confirm POST dedupes against the same ledger row. Pre-write validation (`resolveConfirmTagsAndCategory`) stays outside the idempotent section so a failed validation records no ledger row and the key stays resubmittable. See [Idempotency Ledger](../../idempotency-ledger.md).

## Dependencies

- `../../db/client` — `createDbClient`
- `../../lib/db/expense-access` — `createManyAndExpense`
- `../../lib/db/confirm-helpers` — `resolveConfirmTagsAndCategory`
- `../../lib/expense-validators` — `parseExpenseCreate`, `FieldErrors`
- `../../lib/form-state` — `redirectWithFormErrors`, `ExpenseFormValues`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/submission-idempotency` — `withIdempotency` (Issue 19)
- `../../lib/result` — `Result` (true-myth)
- `./expense-form-helpers` — `readRawBody`, `requireUserId`, `EXPENSE_ADDED_OUTCOME`
