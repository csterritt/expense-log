# 14-filter-description-dates.spec.ts

**Source:** `e2e-tests/expenses/14-filter-description-dates.spec.ts`

## Purpose

End-to-end coverage for the expense filter bar description and date-range filtering functionality.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` to match server behavior.
- Helper `ymdMonthsAgo` offsets dates by months for window testing.
- Uses [`seedExpenses`](../support/db-helpers.md) to seed test expenses.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Filter bar is rendered on the expenses page

- Asserts filter bar, description input, from/to date inputs, and submit button are visible.

### First load shows default 2-month window (no filter params)

- Seeds expenses inside and outside the 2-month window.
- Asserts only in-window expense appears on initial load.

### Description filter: substring, case-insensitive

- Seeds expenses with `'Grocery Store'`, `'GROCERY ONLINE'`, `'Gas Station'`.
- Filters by `'grocery'`.
- Asserts both grocery variants appear, gas station does not.

### From date filter excludes earlier expenses

- Seeds March and January expenses.
- Sets from date to `'2024-03-01'`.
- Asserts March expense appears, January does not.

### To date filter excludes later expenses

- Seeds March and January expenses.
- Sets to date to `'2024-02-01'`.
- Asserts January expense appears, March does not.

### Open-from: only from set shows all expenses from that date onward

- Seeds old (2020) and future (2025) expenses.
- Sets from date to `'2024-01-01'`.
- Asserts future expense appears, old does not.

### Open-to: only to set shows all expenses up to that date

- Seeds old (2020) and future (2025) expenses.
- Sets to date to `'2024-01-01'`.
- Asserts old expense appears, future does not.

### No-filters submit (both from and to empty) returns all expenses

- Seeds old and future expenses.
- Submits with empty filters.
- Asserts both expenses appear.

### Filter values are reflected in the form inputs after submit

- Sets description, from, and to filters.
- Submits.
- Asserts filter inputs retain their values.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
