# 02-entry-form.spec.ts

**Source:** `e2e-tests/expenses/02-entry-form.spec.ts`

## Purpose

End-to-end coverage for Issue 03: signs in `KNOWN_USER`, seeds a category with [`seedCategories`](../support/db-helpers.md), and exercises the entry form on `/expenses` end-to-end (render, valid submissions for every amount variant from the issue, and server-side rejection of bad amounts).

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` to mirror the server's `todayEt`.
- Local `submitEntryForm(page, opts)` helper fills the form fields by `data-testid` and clicks `expense-form-create`.
- All tests run via `testWithDatabase` for isolation.

## Tests

### `renders with today (ET) defaulted and category select populated`

- Asserts the form (`expense-form`) is visible.
- Asserts `expense-form-date` has value equal to `todayEt()`.
- Asserts `expense-form-category` contains an option with text `Food` (the seeded category).

### `accepts each amount variant, posts, redirects, and renders formatted rows`

- Submits four cases in reverse-alpha description order so each new row sorts to the top of the case-insensitive description tiebreak: `Zzz` (`1234.56`), `Yyy` (`1,234.56`), `Xxx` (`1234`), `Www` (`.50`).
- After each submission asserts:
  - Redirect lands on `/expenses`.
  - The first `expense-row-description` matches the just-submitted description.
  - The first `expense-row-amount` matches the expected `formatCents` output (`1,234.56`, `1,234.56`, `1,234.00`, `0.50`).
  - The form fields are cleared (`expense-form-description` and `expense-form-amount` have empty values).
- Final assertion: total row count equals the number of cases (4).

### `rejects zero and non-numeric amounts with no new row created`

- Submits `amount=0` and `amount=abc`.
- Asserts the field-level `expense-form-amount-error` testid is visible after each submission. (Issue 04 replaced the original `role='alert'.alert-error` banner with per-field error rendering — see [03-validation-errors.spec.md](03-validation-errors.spec.md).)
- Asserts `expense-row` count is 0 — neither bad submission produced a row.

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — route under test.
- [../../src/lib/money.md](../../src/lib/money.md) — `parseAmount` rejects the bad inputs that this spec exercises.
- [../../src/lib/expense-validators.md](../../src/lib/expense-validators.md) — produces the field-level error asserted in the rejection test.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedCategories` helper.
- [01-list-rendering.spec.md](01-list-rendering.spec.md) — sibling spec covering Issue 02 list rendering.
- [03-validation-errors.spec.md](03-validation-errors.spec.md) — sibling spec covering Issue 04 per-field validation.
