# src/routes/expenses/expense-list-renderer.tsx

Render functions for the expenses list page. Extracted from `build-expenses.tsx` during the Issue 14B refactoring.

## Purpose

Provides pure render functions for the expenses list page UI:
- Filter bar with description, date range, category, and tag filters
- Expense table with sortable columns
- Complete expenses page layout

## Exports

### `renderFilterBar(categories, tags, activeFilters, filterErrors)`

Renders the filter bar form with:
- Description text input
- From/to date inputs
- Category dropdown
- Tag checkboxes with Any/All mode radios
- Filter button
- Clear filters link (visible only when filters are active)

All inputs include `data-testid` attributes for Playwright targeting.

### `renderExpenseTable(rows)`

Renders the expenses table with columns:
- Date
- Description
- Category
- Tags (comma-separated, alphabetized)
- Amount (right-aligned, formatted via `formatCents`)
- Edit button (links to `/expenses/:id/edit`)

### `renderExpenses(rows, state, payloads, allCategories, allTags, activeFilters, filterErrors)`

Renders the complete expenses page:
- Page heading
- Expense entry form (via `renderExpenseForm`)
- Filter bar (via `renderFilterBar`)
- Expense table or empty state (via `renderExpenseTable`)
- Progressive enhancement script tags (category combobox, tag chip picker)

## Dependencies

- `../../constants` — `PATHS`
- `../../lib/db/category-access` — `CategoryRow` type
- `../../lib/db/tag-access` — `TagRow` type
- `../../lib/db/expense-access` — `ExpenseRow` type
- `../../lib/money` — `formatCents`
- `../../lib/expense-validators` — `FieldErrors`, `ParsedExpenseListFilters` types
- `./expense-form` — `renderExpenseForm`, `ExpenseFormPayloads`, `ExpenseFormState`

## Cross-references

- See [build-expenses.tsx](./build-expenses.tsx.md) — the orchestrator that uses these render functions via the GET handler
- See [expense-get-handler.ts](./expense-get-handler.ts.md) — the GET handler that calls `renderExpenses`
