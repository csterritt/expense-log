# expense-get-handler.ts

**Source:** `src/routes/expenses/expense-get-handler.ts`

## Purpose

GET handler for the expenses list page (`/expenses`). Fetches expenses, categories, and tags; applies filters; reads flash form state; and renders the full page.

## Flow

1. Creates a DB client.
2. Parses query parameters for filters: `description`, `from`, `to`, `categoryId`, `tagId` (array), `tagMode`.
3. If no filter params are present, uses the default 2-month ET date range.
4. Fetches expenses, categories, and tags.
5. Resolves tag IDs against the database: filters out stale/unknown `tagId` values so the filter bar only shows chips for tags that still exist.
6. Reads and clears any flash form state (for sticky values after validation errors or confirmation cancel).
7. Renders the page via `renderExpenses`, which includes the entry form, filter bar, and expense table.

## Key functions

- `handleExpensesGet(c)` — Main GET handler.

## Cross-references

- [expense-list-renderer.md](expense-list-renderer.md) — `renderExpenses`, `renderFilterBar`, `renderExpenseTable`.
- [expense-form.md](expense-form.md) — `renderExpenseForm` and form types.
- [../../lib/et-date.md](../../lib/et-date.md) — `defaultRangeEt`, `todayEt`.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseExpenseListFilters`.
- [../../lib/form-state.md](../../lib/form-state.md) — `readAndClearFormState`.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `listExpenses`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
