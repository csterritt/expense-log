# 05-tags-and-inline-creation.spec.ts

**Source:** `e2e-tests/expenses/05-tags-and-inline-creation.spec.ts`

## Purpose

End-to-end coverage for Issue 06's tags + combined inline-creation flow on the entry form. Exercises: a tags CSV that mixes existing and new names routes through the generalised "Confirm new items" page; case-insensitive de-duplication collapses duplicates and the list row shows tags alphabetically; a brand-new category combined with brand-new tags lists every new name on the confirmation page; resubmitting with names that all now exist takes the direct (no-confirmation) path; Cancel preserves the **raw** typed CSV byte-for-byte; over-max tag names short-circuit with a `tags` field error; an all-whitespace CSV creates the expense with no tags attached.

## Setup

- Local `tagNameMax = 22` mirrors the test-mode constant in `src/lib/expense-validators.ts` (production is `20`). Kept in sync via the `PRODUCTION:UNCOMMENT` convention.
- Local `todayEt()` mirrors the server's `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` helper.
- `signInAndGoToExpenses(page)` signs in `KNOWN_USER` and navigates to `/expenses`.
- `fillEntryForm(page, opts)` fills `description`, `amount`, `date`, `category`, and `tags` by `data-testid`. `submitEntryForm(page)` clicks `expense-form-create`.
- All tests run via `testWithDatabase` for isolation; tests seed via [`seedCategories`](../support/db-helpers.md) and [`seedExpenses`](../support/db-helpers.md) (the latter is used to introduce a pre-existing `groceries` tag through an expense row).

## Tests (5 total)

### `mixed existing+new tags routes through confirmation, dedup applies, list shows alphabetical tags`

- Pre-seeds an expense with category `food` and tag `groceries`.
- Submits the entry form with `category='food'` and `tags='food, groceries, food'` (where the `food` *tag* does not yet exist).
- Asserts `confirm-create-new-page` is visible, `confirm-create-new-category-line` is absent (category exists), exactly one `confirm-create-new-tag-line` lists `'food'`, and the tag preview reads `food, groceries`.
- Confirms; asserts the new `expense-row` for "Weekly shop" has `expense-row-tags` text `food, groceries` (alphabetical, the typed duplicate silently dropped).

### `brand-new category + new tags lists every new name; second submit takes the existing-match branch`

- Submits with brand-new `category='Groceries'` and brand-new `tags='Rent, Utilities'`.
- Asserts the confirmation page lists `Create category 'groceries'` first plus two `confirm-create-new-tag-line`s — `'rent'` then `'utilities'` (alphabetical within the tag group).
- Confirms; asserts the new row has category `groceries` and `expense-row-tags='rent, utilities'`.
- Second submission with `category='GROCERIES'` (any case) and `tags='Rent'` — every name now exists. Asserts no confirmation page is rendered and the new row has `expense-row-tags='rent'`. Demonstrates both case-insensitive matching and the all-existing direct path.

### `cancel preserves the raw typed tag CSV (case + duplicates) and creates nothing`

- Submits with `tags='Food, food, Groceries'` and an existing category. The submission triggers the confirmation page (one new tag).
- Clicks `confirm-create-new-cancel`. Asserts the entry form is restored with **every** typed value preserved verbatim — including the raw CSV string `Food, food, Groceries` (original case + duplicate). No `expense-row` exists.

### `over-max tag name shows tags field error and skips the confirmation page`

- Submits with `tags='food, ' + 'g'.repeat(tagNameMax + 1)`.
- Asserts `confirm-create-new-page` is absent, `expense-form-tags-error` is visible, every other typed field's sticky value (including the original raw CSV in the tags input) is preserved, and no `expense-row` exists.

### `whitespace-only tag CSV creates the expense with no tags attached`

- Submits with `tags=' , ,   '` (all whitespace) plus an existing category.
- Asserts the confirmation page is **not** shown (zero new tags after normalisation, existing category), the new `expense-row` for "Plain expense" exists, and its `expense-row-tags` cell is empty.

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — POST handlers and confirmation page under test.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — `findTagsByNames`, `createExpenseWithTags`, `createManyAndExpense` are the DB helpers being exercised end-to-end.
- [../../src/lib/expense-validators.md](../../src/lib/expense-validators.md) — `parseTagCsv` is the validator that suppresses confirmation for over-max / whitespace-only inputs.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedCategories`, `seedExpenses`.
- [04-inline-category-creation.spec.md](04-inline-category-creation.spec.md) — sibling spec for the Issue 05 category-only path; testids were renamed in Issue 06 from `confirm-create-category-*` to `confirm-create-new-*`.

---

See [../../e2e-tests.md](../../e2e-tests.md) for the full catalog.
