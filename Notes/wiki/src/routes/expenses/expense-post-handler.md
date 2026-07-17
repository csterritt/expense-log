# src/routes/expenses/expense-post-handler.ts

POST handler for expense creation.

## Functions

### handleExpensesPost(c): Promise\<Response\>

1. Parses and validates form body via `parseExpenseCreate`
2. On validation error: redirects back with form errors (PRG)
3. Fetches all tags and parses tag inputs (`parseTagInputs`)
4. Validates tag IDs exist
5. Looks up category by name (`findCategoryByName`)
6. **If everything is existing**: creates expense directly via `createExpenseWithTags`, redirects with success
7. **If new category or new tags**: validates new category name, renders confirmation page (`renderConfirmNewItems`) with hidden fields for user to confirm

## Confirmation Flow

When new category names or new tag names are detected, the handler does NOT write to DB. Instead it renders a confirmation page showing what will be created. The user confirms via `POST /expenses/confirm-create-new`.

## Dependencies

- `../../db/client` — `createDbClient`
- `../../lib/db/category-access` — `findCategoryByName`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/db/expense-access` — `createExpenseWithTags`
- `../../lib/expense-validators` — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagInputs`
- `../../lib/form-state` — `redirectWithFormErrors`, `ExpenseFormValues`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `./expense-form-helpers` — `readRawBody`
- `./expense-form` — `renderConfirmNewItems`
- `../build-layout` — `useLayout`
