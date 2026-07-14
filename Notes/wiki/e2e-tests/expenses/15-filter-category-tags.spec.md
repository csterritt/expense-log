# 15-filter-category-tags.spec.ts

**Source:** `e2e-tests/expenses/15-filter-category-tags.spec.ts`

## Purpose

End-to-end coverage for the expense filter bar category and tag filtering functionality.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Uses [`seedExpenses`](../support/db-helpers.md) and [`seedTags`](../support/db-helpers.md) to seed test data.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Category dropdown filters results to matching category

- Seeds food and utilities expenses.
- Selects `'food'` from category dropdown.
- Asserts only food expense appears.

### All-categories option returns all expenses

- Seeds food and utilities expenses.
- Selects empty value from category dropdown.
- Asserts both expenses appear.

### Tag checkboxes are displayed when tags exist

- Seeds `'work'` and `'personal'` tags.
- Asserts both tag checkboxes are visible.

### Tag OR filter returns expenses with any selected tag

- Seeds expenses with `'work'` only, `'personal'` only, and no tags.
- Checks both tag checkboxes and OR mode.
- Asserts both tagged expenses appear, untagged does not.

### Tag AND filter returns only expenses with all selected tags

- Seeds expenses with `'work'` only, `'personal'` only, and both tags.
- Checks both tag checkboxes and AND mode.
- Asserts only expense with both tags appears.

### Single-tag filter with OR mode returns only that tagged expense

- Seeds expense with `'work'` tag and untagged expense.
- Checks `'work'` checkbox.
- Asserts only tagged expense appears.

### Tag selection persists after submit

- Seeds `'work'` tag.
- Checks `'work'` checkbox and submits.
- Asserts checkbox remains checked after submit.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
