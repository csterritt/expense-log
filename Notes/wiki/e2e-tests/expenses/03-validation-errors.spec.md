# 03-validation-errors.spec.ts

**Source:** `e2e-tests/expenses/03-validation-errors.spec.ts`

## Purpose

End-to-end coverage for Issue 04: per-field validation errors and sticky-value preservation on the `/expenses` entry form. Signs in `KNOWN_USER`, seeds a single `Food` category via [`seedCategories`](../support/db-helpers.md), and exercises every failure case from the issue while asserting that valid sibling fields keep their typed values across the redirect.

## Setup

- Local `descriptionMax = 202` mirrors the test-mode constant in [`src/lib/expense-validators.md`](../../src/lib/expense-validators.md). Kept in sync manually.
- Local `todayEt()` reproduces the server's ET date so the fix-and-resubmit test stays inside `defaultRangeEt()` and the new row actually renders.
- Local `fillForm(page, opts)` fills description / amount / date / (optionally) category by `data-testid`; leaving `categoryLabel` undefined keeps the placeholder selected so the test can exercise the missing-category path.
- Local `submit(page)` clicks `expense-form-create` and waits for navigation back to `/expenses`.
- Every test runs under [`testWithDatabase`](../support/test-helpers.md) for isolation.

## Tests

### `empty description: error shown, other fields preserved`

Submits with `description=''`, valid amount/date/category. Asserts `expense-form-description-error` is visible, the description input is still empty, and amount/date/category retain their typed values; `expense-row` count is `0`.

### `over-max description: error shown, other fields preserved`

Submits with `'a'.repeat(descriptionMax + 1)`. Asserts the description error is visible, sibling values preserved, no row created. Requires the form's input `maxLength` to be larger than the validator's `descriptionMax` so the browser doesn't truncate before the request leaves; the form intentionally uses `maxLength={descriptionMax + 50}`.

### `bad amounts: each variant shows amount error and preserves other fields`

Iterates `['1.234', '-5', '0', 'abc']`. After each submission asserts `expense-form-amount-error` is visible, `expense-form-amount` is the rejected value (sticky), `description` and `date` are also sticky, and no row was created.

### `invalid date 2025-13-40: date error shown, other fields preserved`

Submits the impossible date `2025-13-40` with valid other fields. Asserts the date error is visible, the date input still holds `'2025-13-40'`, and description/amount are sticky. Requires the date input to be `type='text'` with a `pattern` (rather than `type='date'`) so the invalid value can leave the browser.

### `no category selected: category error shown, other fields preserved`

Submits without selecting a category (placeholder remains the active option). Asserts `expense-form-category-error` is visible and the other fields are sticky.

### `multiple invalid fields at once: all errors shown simultaneously`

Submits `{ description: '', amount: '1.234', date: '2025-13-40' }` with no category. Asserts all four `expense-form-{field}-error` testids are visible at once; the bad amount and date values are still in the inputs (proves both error rendering and sticky values work in the multi-field case).

### `fix and resubmit after error: row is created, form clears`

Round-trip: submits `description='Lunch', amount='0', date=todayEt(), category=Food` (amount fails) → fixes only the amount to `9.99` → resubmits. Asserts the amount error is gone, exactly one `expense-row` exists, and `expense-form-description` / `expense-form-amount` are now empty (single-use cookie consumed; the success path doesn't re-stash form state).

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — route under test.
- [../../src/lib/expense-validators.md](../../src/lib/expense-validators.md) — produces the field-level errors asserted here.
- [../../src/lib/form-state.md](../../src/lib/form-state.md) — round-trips `{fieldErrors, values}` across the redirect.
- [02-entry-form.spec.md](02-entry-form.spec.md) — sibling spec covering the Issue 03 happy path and the (now field-level) zero/abc rejection.
- [01-list-rendering.spec.md](01-list-rendering.spec.md) — sibling spec covering the Issue 02 list rendering.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedCategories` helper.
