# src/routes/expenses/expense-confirm-post-handler.ts

POST handler for expense creation confirmation (when new categories/tags are involved).

## Functions

### handleExpensesConfirmPost(c): Promise\<Response\>

1. If `action === 'cancel'`: redirects back to expenses with form values preserved (no errors)
2. Re-validates all fields defensively (hidden inputs could be tampered)
3. Calls `resolveConfirmTagsAndCategory` to resolve tag/category state
4. On resolution failure: redirects with appropriate error
5. On success: calls `createManyAndExpense` to atomically create new category + new tags + expense + tag links
6. On DB error: redirects with field-specific error
7. On success: redirects with "Expense added." message

## Dependencies

- `../../db/client` — `createDbClient`
- `../../lib/db/expense-access` — `createManyAndExpense`
- `../../lib/db/confirm-helpers` — `resolveConfirmTagsAndCategory`
- `../../lib/expense-validators` — `parseExpenseCreate`, `FieldErrors`
- `../../lib/form-state` — `redirectWithFormErrors`, `ExpenseFormValues`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `./expense-form-helpers` — `readRawBody`
