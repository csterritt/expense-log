# 04-inline-category-creation.spec.ts

**Source:** `e2e-tests/expenses/04-inline-category-creation.spec.ts`

## Purpose

End-to-end coverage for Issue 05's inline-category-creation flow on the entry form. Exercises the no-JS round-trip: typed category names that don't match an existing row redirect through a consolidated confirmation page; Confirm atomically creates the new category + expense; Cancel rounds-tripts every typed value back to the entry form with no DB writes; both pre-confirmation field validation (over-max, whitespace-only) and post-confirmation behaviour are asserted.

## Setup

- Local `categoryNameMax = 22` mirrors the test-mode constant in `src/lib/expense-validators.ts` (production is `20`). Kept in sync via the `PRODUCTION:UNCOMMENT` convention.
- Local `todayEt()` mirrors the server's `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` helper.
- `signInAndGoToExpenses(page)` signs in `KNOWN_USER` and navigates to `/expenses`.
- `fillEntryForm(page, opts)` fills `description`, `amount`, `date`, `category` by `data-testid`. `submitEntryForm(page)` clicks `expense-form-create`.
- All tests run via `testWithDatabase` for isolation; each test seeds a single `Food` category via [`seedCategories`](../support/db-helpers.md) so the existing-match branch can be contrasted with the no-match branch.

## Tests (5 total)

### `unmatched name renders the consolidated confirmation page`

- Submits with `category='Groceries'` (not seeded).
- Asserts `confirm-create-category-page` is visible and that every mirror field (`-name`, `-description`, `-amount`, `-date`, `-category`) shows the lowercased category name and the typed expense values verbatim.

### `cancel preserves every typed value and creates nothing`

- Submits with an unmatched `category='Groceries'`, lands on the confirmation page, clicks `confirm-create-category-cancel`.
- After waiting for `/expenses`, asserts all four entry-form fields still hold the originally-typed values (including the original-case `Groceries` in the category input) and that no `expense-row` was created.

### `confirm creates the category + expense and routes future submits through the existing-match branch`

- First submission: typed `Groceries` is unmatched, lands on the confirmation page; click `confirm-create-category-confirm`.
- After waiting for `/expenses`, asserts a single `expense-row` exists with `expense-row-category` text `groceries` (matching the lowercasing performed by `createCategoryAndExpense`) and that the entry form is cleared.
- Second submission: typed `GROCERIES` (different case) now matches the just-created row.
  - `confirm-create-category-page` is **not** rendered.
  - The expense list grows to two rows.
- Together this proves both `findCategoryByName`'s case-insensitive match and the atomic create's lowercasing in a single test.

### `over-max category name shows field error and skips the confirmation page`

- Submits with `category='g'.repeat(categoryNameMax + 1)`.
- After redirect, asserts `confirm-create-category-page` is **not** present, `expense-form-category-error` is visible, and every other typed field's sticky value is preserved.

### `whitespace-only category name shows field error and skips the confirmation page`

- Submits with `category='   '`.
- Asserts no confirmation page, `expense-form-category-error` visible, and no `expense-row` created.

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — POST handlers under test.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — `findCategoryByName` and `createCategoryAndExpense` are the DB helpers being exercised end-to-end here.
- [../../src/lib/expense-validators.md](../../src/lib/expense-validators.md) — `parseNewCategoryName` is the validator that suppresses confirmation for over-max / whitespace-only inputs.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedCategories`.
- [02-entry-form.spec.md](02-entry-form.spec.md), [03-validation-errors.spec.md](03-validation-errors.spec.md) — sibling expense entry-form specs.

---

See [../../e2e-tests.md](../../e2e-tests.md) for the full catalog.
