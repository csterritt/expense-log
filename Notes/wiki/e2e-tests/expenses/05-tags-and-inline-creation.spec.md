# 05-tags-and-inline-creation.spec.ts

**Source:** `e2e-tests/expenses/05-tags-and-inline-creation.spec.ts`

## Purpose

End-to-end coverage for the tag chip-checkbox + inline creation flow on the entry form (no-JS path). Tests: toggling an existing chip + typing a new tag name routes through confirmation; brand-new category + new tags; cancel preserves chip selections and `newTags` text; over-max tag names in `newTags` short-circuit with a `tags` field error; whitespace-only `newTags` creates the expense with no tags attached.

## Setup

- Local `tagNameMax = 22` mirrors the test-mode constant in `src/lib/expense-validators.ts` (production is `20`). Kept in sync via the `PRODUCTION:UNCOMMENT` convention.
- Local `todayEt()` mirrors the server's `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` helper.
- `signInAndGoToExpenses(page)` signs in `KNOWN_USER` and navigates to `/expenses`.
- `fillEntryForm(page, opts)` fills `description`, `amount`, `date`, `category`, and `newTags` by `data-testid`. `submitEntryForm(page)` clicks `expense-form-create`.
- All tests run via `testWithDatabase` for isolation; tests seed via [`seedCategories`](../support/db-helpers.md) and [`seedExpenses`](../support/db-helpers.md).
- Tests run with `javaScriptEnabled: false` to exercise the plain server-side flow.

## Tests (5 total)

### `chip-checked existing tag + new tag in text routes through confirmation, list shows alphabetical tags`

- Pre-seeds an expense with category `food` and tag `groceries`.
- Toggles the `'groceries'` chip (existing tag) and fills `newTags='food'` (new tag).
- Asserts `confirm-create-new-page` is visible, `confirm-create-new-category-line` is absent (category exists), exactly one `confirm-create-new-tag-line` lists `'food'`, and the tag preview reads `food, groceries`.
- Confirms; asserts the new `expense-row` for "Weekly shop" has `expense-row-tags` text `food, groceries` (alphabetical).

### `brand-new category + new tags lists every new name; second submit takes the existing-match branch`

- Submits with brand-new `category='Groceries'` and `newTags='Rent, Utilities'`.
- Asserts the confirmation page lists `Create category 'groceries'` first plus two `confirm-create-new-tag-line`s — `'rent'` then `'utilities'` (alphabetical).
- Confirms; asserts the new row has category `groceries` and `expense-row-tags='rent, utilities'`.
- Second submission: toggles the now-existing `'rent'` chip, uses `category='GROCERIES'` (any case), and leaves `newTags` empty. Asserts no confirmation page is rendered and the new row has `expense-row-tags='rent'`. Demonstrates case-insensitive matching and the all-existing direct path.

### `cancel preserves new-tags input value and chip selections and creates nothing`

- Toggles `'groceries'` chip and fills `newTags='mynewtag'`.
- Submits to trigger the confirmation page.
- Clicks `confirm-create-new-cancel`. Asserts the entry form is restored with every typed value preserved — including the `newTags` input text and the chip selection state. No `expense-row` exists.

### `over-max tag name in new-tags shows tags field error and skips the confirmation page`

- Submits with `newTags` containing a tag name longer than `tagNameMax`.
- Asserts `confirm-create-new-page` is absent, `expense-form-tags-error` is visible, every other typed field's sticky value is preserved, and no `expense-row` exists.

### `whitespace-only new-tags creates the expense with no tags attached`

- Submits with `newTags=' , ,   '` (all whitespace) plus an existing category.
- Asserts the confirmation page is **not** shown, the new `expense-row` for "Plain expense" exists, and its `expense-row-tags` cell is empty.

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — POST handlers and confirmation page under test.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — `createExpenseWithTags`, `createManyAndExpense` are the DB helpers being exercised end-to-end.
- [../../src/lib/expense-validators.md](../../src/lib/expense-validators.md) — `parseTagInputs` is the validator that suppresses confirmation for over-max / whitespace-only inputs.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedCategories`, `seedExpenses`.
- [04-inline-category-creation.spec.md](04-inline-category-creation.spec.md) — sibling spec for the Issue 05 category-only path.

---

See [../../e2e-tests.md](../../e2e-tests.md) for the full catalog.
