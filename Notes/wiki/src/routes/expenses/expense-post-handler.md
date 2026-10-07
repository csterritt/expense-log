# src/routes/expenses/expense-post-handler.ts

POST handler for expense creation.

## Functions

### handleExpensesPost(c): Promise\<Response\>

1. Parses and validates form body via `parseExpenseCreate`
2. On validation error: redirects back with form errors (PRG)
3. Fetches all tags and parses tag inputs (`parseTagInputs`)
4. Validates tag IDs exist
5. Looks up category by name (`findCategoryByName`)
6. **If everything is existing**: routes the commit through [`withIdempotency`](../../lib/submission-idempotency.md) (keyed off `raw.submissionKey` + `requireUserId(c)`) wrapping `createExpenseWithTags`; on success redirects with `EXPENSE_ADDED_OUTCOME` (see [Idempotency Ledger](../../idempotency-ledger.md))
7. **If new category or new tags**: validates new category name, renders confirmation page (`renderConfirmNewItems`) with hidden fields (including the original `submissionKey`) for user to confirm — no DB write, no ledger row

## Confirmation Flow

When new category names or new tag names are detected, the handler does NOT write to DB. Instead it renders a confirmation page showing what will be created. The user confirms via `POST /expenses/confirm-create-new`. The original `submissionKey` is round-tripped through the confirm form's hidden fields so the confirm POST carries the same key.

## Idempotency

Only the direct-create commit (step 6) is wrapped in `withIdempotency`. Pre-write validation and the confirmation-page render branch stay outside the idempotent section so a failed validation records no ledger row and the key stays resubmittable. See [Idempotency Ledger](../../idempotency-ledger.md).

## Dependencies

- `../../db/client` — `createDbClient`
- `../../lib/db/category-access` — `findCategoryByName`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/db/expense-access` — `createExpenseWithTags`
- `../../lib/expense-validators` — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagInputs`
- `../../lib/form-state` — `redirectWithFormErrors`, `ExpenseFormValues`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/submission-idempotency` — `withIdempotency` (Issue 19)
- `../../lib/result` — `Result` (true-myth)
- `./expense-form-helpers` — `readRawBody`, `requireUserId`, `EXPENSE_ADDED_OUTCOME`
- `./expense-form` — `renderConfirmNewItems`
- `../build-layout` — `useLayout`
