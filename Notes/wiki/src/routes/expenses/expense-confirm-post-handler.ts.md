# src/routes/expenses/expense-confirm-post-handler.ts

POST handler for expense creation confirmation. Extracted from `build-expenses.tsx` during the Issue 14B refactoring.

## Purpose

Handles POST requests to `/expenses/confirm-create-new` for confirming expense creation with new categories/tags:
- Handles Cancel action (round-trips typed values without DB writes)
- Defensively re-validates all fields
- Creates new categories and tags atomically
- Creates the expense with all tags
- Handles collision errors with appropriate field error placement

## Exports

### `handleExpensesConfirmPost(c)`

Async handler function that:
1. Parses raw form body via `readRawBody`
2. If action is 'cancel':
   - Redirects with empty field errors but preserves all typed values
3. Defensive re-validation:
   - Validates expense fields via `parseExpenseCreate`
   - Parses tags CSV via `parseTagCsv`
   - On validation error, redirects with field errors and sticky values
4. Looks up category by name (case-insensitive)
5. Looks up tags by names (case-insensitive)
6. Computes diff: new tag names vs existing tag IDs
7. Determines new category name (if category doesn't exist) vs existing category ID
8. Validates new category name via `parseNewCategoryName` (if applicable)
9. Creates everything atomically via `createManyAndExpense`:
   - Optional new category
   - All new tags
   - The expense
   - All expense-tag links
10. On collision error, surfaces error under `category` if creating new category, otherwise under `tags`
11. On success, redirects with success message

## Dependencies

- `hono` — `Context` type
- `../../local-types` — `Bindings` type
- `../../db/client` — `createDbClient`
- `../../lib/db/category-access` — `findCategoryByName`
- `../../lib/db/tag-access` — `findTagsByNames`
- `../../lib/db/expense-access` — `createManyAndExpense`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/expense-validators` — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagCsv`, `FieldErrors`
- `../../lib/form-state` — `redirectWithFormErrors`, `ExpenseFormValues`
- `./expense-form-helpers` — `readRawBody`
- `../../constants` — `PATHS`

## Cross-references

- See [build-expenses.tsx](./build-expenses.tsx.md) — the orchestrator that registers this handler
- See [expense-post-handler.ts](./expense-post-handler.ts.md) — renders the confirmation page that this handler processes
- See [expense-form-helpers.ts](./expense-form-helpers.ts.md) — provides the `readRawBody` function
