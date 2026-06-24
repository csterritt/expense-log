# expense-list-renderer.tsx

**Source:** `src/routes/expenses/expense-list-renderer.tsx`

## Purpose

JSX render functions for the expenses list page: filter bar, expense table, and the complete page wrapper.

## Exported functions

### `renderFilterBar`

Renders the filter bar form with:
- **Description** text input (`filter-description`)
- **From/To** date inputs (`filter-from`, `filter-to`) with shared date-error display
- **Category** dropdown (`filter-category`) with "All categories" option
- **Tags** rendered via the shared `TagChipCheckboxes` component (`tag-chip-checkboxes` testid) with OR/AND mode radio buttons (`filter-tag-mode-or`, `filter-tag-mode-and`), only shown when tags exist
- **Filter** submit button and **Clear filters** link (shown only when any filter is active)

### `renderExpenseTable`

Renders the expenses table with columns: Date, Description, Category, Tags, Amount, Edit link.
- Generated recurring rows show an underlined description with a ↻ badge (`expense-row-recurring-badge`).
- Each row has `data-testid='expense-row'` and `data-expense-id`.

### `renderExpenses`

Renders the complete expenses page combining:
- The expense entry form (`renderExpenseForm` in create mode)
- The filter bar
- The expense table or empty-state message (`No expenses yet`)
- Deferred scripts: `category-combobox.js` and `tag-chip-checkboxes.js`

## Cross-references

- [expense-form.md](expense-form.md) — `renderExpenseForm` and form types.
- [../../components/tag-chip-checkboxes.md](../../components/tag-chip-checkboxes.md) — `TagChipCheckboxes` component used for filter bar tags.
- [../../lib/money.md](../../lib/money.md) — `formatCents`.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `ExpenseRow` type.
- [../../lib/db/category-access.md](../../lib/db/category-access.md) — `CategoryRow` type.
- [../../lib/db/tag-access.md](../../lib/db/tag-access.md) — `TagRow` type.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `FieldErrors`, `ParsedExpenseListFilters` types.
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
