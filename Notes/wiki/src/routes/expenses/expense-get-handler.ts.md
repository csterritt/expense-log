# src/routes/expenses/expense-get-handler.ts

GET handler for the expenses list page. Extracted from `build-expenses.tsx` during the Issue 14B refactoring.

## Purpose

Handles GET requests to `/expenses`:
- Parses query-string filter parameters
- Loads expenses, categories, and tags from the database
- Applies default 2-month window on first load
- Renders the expenses page with filters and data

## Exports

### `handleExpensesGet(c)`

Async handler function that:
1. Creates a database client
2. Reads query string parameters (`description`, `from`, `to`, `categoryId`, `tagId`, `tagMode`)
3. Parses filters via `parseExpenseListFilters`
4. Applies default 2-month ET window when `hasFilterParams` is false (first load)
5. Fetches expenses, categories, and tags in parallel
6. Builds form payloads for the entry form
7. Reads and clears any flashed form state from redirects
8. Renders the complete expenses page via `renderExpenses`

On database errors, redirects to sign-in with an error message.

## Dependencies

- `hono` — `Context` type
- `../../local-types` — `Bindings` type
- `../../db/client` — `createDbClient`
- `../build-layout` — `useLayout`
- `../../lib/et-date` — `defaultRangeEt`, `todayEt`
- `../../lib/db/expense-access` — `listExpenses`
- `../../lib/db/category-access` — `listCategories`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/redirects` — `redirectWithError`
- `../../lib/expense-validators` — `parseExpenseListFilters`
- `../../lib/form-state` — `readAndClearFormState`
- `./expense-list-renderer` — `renderExpenses`
- `./expense-form-helpers` — `emptyState`
- `../../constants` — `PATHS`
- `./expense-form` — `ExpenseFormPayloads`, `ExpenseFormState` types

## Cross-references

- See [build-expenses.tsx](./build-expenses.tsx.md) — the orchestrator that registers this handler
- See [expense-list-renderer.tsx](./expense-list-renderer.tsx.md) — provides the `renderExpenses` function
- See [expense-form-helpers.ts](./expense-form-helpers.ts.md) — provides the `emptyState` function
