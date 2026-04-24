# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expense list page (`/expenses`) — the post-sign-in landing page that replaced the legacy `/private` route. Issue 02 added rendering of expense rows when results are present; the empty state is preserved when the result set is empty.

## Export

### `buildExpenses(app): void`

Route: `GET /expenses`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Behaviour

1. Calls `defaultRangeEt()` to compute the default `[from, to]` window (current month plus the previous two ET months).
2. Calls `listExpenses(c, range)`.
3. If the result is empty, renders the empty-state paragraph from Issue 01.
4. Otherwise renders a DaisyUI `table table-zebra` with columns Date, Description, Category, Tags, Amount.

### Page content

- `data-testid='expenses-page'` wrapper.
- `<h1>Expenses</h1>`.
- Empty state: `<p data-testid='expenses-empty-state'>No expenses yet</p>`.
- Populated state: `<table data-testid='expenses-table'>` containing one `<tr data-testid='expense-row' data-expense-id={id}>` per row, with cells:
  - `expense-row-date`
  - `expense-row-description`
  - `expense-row-category`
  - `expense-row-tags` — comma-joined tag names
  - `expense-row-amount` — `formatCents(amountCents)`

## Cross-references

- [../../lib/et-date.md](../../lib/et-date.md) — `defaultRangeEt`
- [../../lib/expense-repo.md](../../lib/expense-repo.md) — `listExpenses`, `ExpenseRow`
- [../../lib/money.md](../../lib/money.md) — `formatCents`
- [../build-layout.md](../build-layout.md) — layout wrapper
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`
- [../auth/better-auth-response-interceptor.md](../auth/better-auth-response-interceptor.md) — redirects verified sign-ins here
- [../../lib/auth.md](../../lib/auth.md) — `redirectTo: '/expenses'` in better-auth config

---

See [source-code.md](../../../source-code.md) for the full catalog.
