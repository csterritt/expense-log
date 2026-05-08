# src/routes/expenses/expense-post-handler.ts

POST handler for expense creation. Extracted from `build-expenses.tsx` during the Issue 14B refactoring.

## Purpose

Handles POST requests to `/expenses` for creating new expenses:
- Validates expense data (description, amount, date, category)
- Parses and validates tags CSV
- Looks up existing categories and tags
- Detects new categories/tags that need to be created
- Either creates the expense directly (all existing) or renders a confirmation page (has new items)

## Exports

### `handleExpensesPost(c)`

Async handler function that:
1. Parses raw form body via `readRawBody`
2. Validates expense fields via `parseExpenseCreate`
3. Parses tags CSV via `parseTagCsv`
4. On validation error, redirects with field errors and sticky values
5. Looks up category by name (case-insensitive)
6. Looks up tags by names (case-insensitive)
7. Computes diff: new tag names vs existing tag IDs
8. If all items exist (no new category, no new tags):
   - Creates expense with tags via `createExpenseWithTags`
   - Redirects with success message
9. If any item is new:
   - Validates new category name via `parseNewCategoryName`
   - Normalizes new category to lowercase
   - Renders confirmation page with `renderConfirmNewItems`
   - Confirmation page shows all new items and a preview

On database errors, redirects with error message.

## Dependencies

- `hono` — `Context` type
- `../../local-types` — `Bindings` type
- `../../db/client` — `createDbClient`
- `../build-layout` — `useLayout`
- `../../lib/db/category-access` — `findCategoryByName`
- `../../lib/db/tag-access` — `findTagsByNames`
- `../../lib/db/expense-access` — `createExpenseWithTags`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/expense-validators` — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagCsv`, `FieldErrors`
- `../../lib/form-state` — `redirectWithFormErrors`, `ExpenseFormValues`
- `./expense-form-helpers` — `readRawBody`
- `./expense-form` — `renderConfirmNewItems`
- `../../constants` — `PATHS`

## Constants

- `CONFIRM_CREATE_NEW_PATH = '/expenses/confirm-create-new'` — used as the confirmation form action

## Cross-references

- See [build-expenses.tsx](./build-expenses.tsx.md) — the orchestrator that registers this handler
- See [expense-confirm-post-handler.ts](./expense-confirm-post-handler.ts.md) — handles the confirmation form submission
- See [expense-form-helpers.ts](./expense-form-helpers.ts.md) — provides the `readRawBody` function
