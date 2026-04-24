## Issue 2: Expense list view rendering

**Type**: AFK
**Blocked by**: Issue 1

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

With data seeded via an existing test database route, render the `/expenses` list of rows for all expenses whose `date` falls within the default three-month window (first of the month two months prior through today, in ET), sorted by date descending with ties broken by case-insensitive description ascending. Each row shows date, description, category, tags (comma-separated), and formatted amount (e.g. `$1,234.56`) — all on a single page with no pagination.

Introduce the `src/lib/money.ts` module (`formatCents` only in this slice) and `src/lib/et-date.ts` module (`todayEt`, `defaultRangeEt`, `isValidYmd`), both with unit tests. Add `expense-repo.listExpenses(filters)` supporting only the date-range filter for now.

See PRD sections *Dates and timezone*, *Money*, *List (default page)*, and the `money` / `et-date` / `expense-repo` module specs.

### How to verify

- **Manual**:
  1. Seed a handful of expenses across the current month, the two preceding months, and one that falls outside the window.
  2. Visit `/expenses`; confirm only in-window rows appear, sorted by date desc with ties broken by description asc (case-insensitive).
  3. Confirm each row shows date, description, category name, tags, and amount formatted as `$1,234.56`.
- **Automated**: unit tests for `money.formatCents` (table of inputs) and `et-date` (today/default-range across DST boundaries, plus `isValidYmd` edges). Playwright e2e seeds rows via the test database route and asserts row count, order, formatted amount, and that out-of-window rows are absent.

### Acceptance criteria

- [ ] Given expenses exist in and out of the default window, when the user visits `/expenses`, then only in-window rows render.
- [ ] Given two expenses on the same date, when they render, then the alphabetically-earlier description appears first (case-insensitive).
- [ ] Given an expense with `amountCents = 123456`, when it renders, then its amount column shows `$1,234.56`.
- [ ] Given any date-string input, `isValidYmd` returns true iff it is a valid calendar date in `YYYY-MM-DD` form.

### User stories addressed

- User story 21: default landing page shows list of expenses in current + two preceding months (ET)
- User story 22: sort by date desc, ties broken by description asc
- User story 23: single page, no pagination
- User story 25: row shows date, description, category, tags, formatted amount

---
