# 16-summary-default-and-grouping.spec.ts

**Source:** `e2e-tests/expenses/16-summary-default-and-grouping.spec.ts`

## Purpose

Issue 12 spec covering the summary page default load, month/year grouping, and grand total.

## Test cases

1. **First load shows the summary page with filter bar and table** — seeds two expenses, signs in, navigates to `/summary`, and asserts `summary-page`, `summary-filter-bar`, and `summary-table` are all visible.
2. **Default grouping is by month with correct rows** — seeds three expenses across two months, asserts two `summary-row` entries with correct `summary-row-date`, `summary-row-total`, and `summary-row-count` values.
3. **Switching to year grouping shows yearly aggregates** — seeds expenses across two years, selects `year` from `summary-group-by`, applies filters, and asserts two rows with correct yearly totals and counts.
4. **Grand total row shows correct aggregates** — seeds two expenses, asserts `summary-grand-total` and `summary-grand-count` match the combined values.
5. **Filter bar shows category dropdown with seeded categories** — seeds expenses with different categories, asserts `summary-category` dropdown contains both category names.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedExpenses`.

