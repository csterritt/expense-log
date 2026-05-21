# 17-summary-date-range-and-empty.spec.ts

**Source:** `e2e-tests/expenses/17-summary-date-range-and-empty.spec.ts`

## Purpose

Issue 12 spec covering the summary page date-range filter, empty state, category filter, and tag filter.

## Test cases

1. **Date range filter narrows results to matching period** — seeds three expenses across Jan/Mar/Jun, sets `summary-from` to `2024-02-01` and `summary-to` to `2024-05-31`, applies filters, and asserts only the March row remains.
2. **Empty state shown when no expenses match filters** — seeds one expense, sets a future date range, applies filters, and asserts `summary-empty` is visible while `summary-table` is absent.
3. **Empty state shown when no expenses exist at all** — navigates to `/summary` with an empty database and asserts `summary-empty` is visible.
4. **Category filter narrows results to matching category** — seeds expenses in two categories, selects one category from `summary-category`, applies filters, and asserts only one row remains with the correct `summary-row-category`.
5. **Tag filter narrows results to matching tag** — seeds expenses with different tags, clicks the target tag checkbox, applies filters, and asserts only one row remains with the correct `summary-row-tag`.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedExpenses`.

