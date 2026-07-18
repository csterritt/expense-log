# src/routes/expenses/expense-list-renderer.tsx

Render functions for the expenses list page.

## Functions

### renderFilterBar(categories, tags, activeFilters, filterErrors): JSX

Renders the filter form with:
- Description search input
- From/To date pickers
- Category dropdown
- Tag chip checkboxes with OR/AND mode toggle
- Clear filters link

### renderExpenses(expenses, state, payloads, categories, tags, filters, filterErrors): JSX

Renders the full expenses page:
- Filter bar
- Expense entry form (create mode)
- Expenses table with columns: Date, Description, Amount, Category, Tags, Actions (Edit/Delete links)
- Empty state message when no expenses

### renderExpenseRow(expense): JSX

Renders a single expense table row with edit/delete links.

## Dependencies

- `../../constants` — `PATHS`
- `../../lib/db/expense-access` — `ExpenseRow`
- `../../lib/db/category-access` — `CategoryRow`
- `../../lib/db/tag-access` — `TagRow`
- `../../lib/money` — `formatCents`
- `../../lib/expense-validators` — `FieldErrors`, `ParsedExpenseListFilters`
- `../../components/tag-chip-checkboxes` — `TagChipCheckboxes`
- `./expense-form` — `renderExpenseForm`, `ExpenseFormPayloads`, `ExpenseFormState`
