# src/routes/expenses/expense-get-handler.ts

GET handler for the expenses list page.

## Functions

### handleExpensesGet(c): Promise\<Response\>

1. Parses query params into filters via `parseExpenseListFilters` (description, from, to, categoryId, tagId[], tagMode)
2. Falls back to `defaultRangeEt()` when no filter params present
3. Fetches expenses, categories, and tags from DB
4. Resolves tag IDs against existing tags (filters out stale IDs)
5. Reads flash form state (sticky values + errors from PRG redirect)
6. Mints a fresh server-generated `submissionKey` (ULID) per rendered page and threads it into the form state so the entry form (and any confirm round-trip) can dedupe replayed submits (Issue 19; see [Idempotency Ledger](../../idempotency-ledger.md))
7. Renders the expenses list page with filter bar, expense form, and expense table

## Dependencies

- `../../db/client` — `createDbClient`
- `../../lib/db/expense-access` — `listExpenses`
- `../../lib/db/category-access` — `listCategories`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/expense-validators` — `parseExpenseListFilters`
- `../../lib/form-state` — `readAndClearFormState`
- `../../lib/et-date` — `defaultRangeEt`, `todayEt`
- `../../lib/redirects` — `redirectWithError`
- `ulid` — `ulid` (Issue 19 submission key mint)
- `../build-layout` — `useLayout`
- `./expense-list-renderer` — `renderExpenses`
- `./expense-form-helpers` — `emptyState`
- `./expense-form` — `ExpenseFormPayloads`, `ExpenseFormState`
