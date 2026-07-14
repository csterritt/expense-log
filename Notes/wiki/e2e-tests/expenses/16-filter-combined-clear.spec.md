# 16-filter-combined-clear.spec.ts

**Source:** `e2e-tests/expenses/16-filter-combined-clear.spec.ts`

## Purpose

End-to-end coverage for combined filter behavior and the Clear filters functionality.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Uses [`seedExpenses`](../support/db-helpers.md) to seed test expenses.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Combining description + from + category narrows results correctly

- Seeds expenses: `'Lunch food'` (today, food), `'Lunch utilities'` (today, utilities), `'Lunch old'` (2020, food).
- Sets description `'Lunch'`, from `'2024-01-01'`, category `'food'`.
- Asserts only `'Lunch food'` appears.

### Clear filters link is absent on first load

- Asserts clear filters link not present on initial unfiltered load.

### Clear filters link appears after applying a description filter

- Seeds expense.
- Sets description filter and submits.
- Asserts clear filters link becomes visible.

### Clear filters link navigates back to unfiltered page and removes filter inputs

- Seeds today and old expenses.
- Sets from date filter to exclude old expense.
- Submits and asserts old expense not shown.
- Clicks clear filters link.
- Asserts navigation to unfiltered `/expenses`, filter inputs cleared, clear link gone.

### Empty filter submission shows empty-state when no matches

- Seeds expense.
- Sets description filter to non-existent string.
- Submits.
- Asserts empty state visible.

### Clear filters after no-result search shows expenses again

- Seeds expense.
- Sets description filter to non-existent string.
- Submits and asserts empty state visible.
- Clicks clear filters.
- Asserts expense appears again.

### Description + tag OR filter is additive AND between both fields

- Seeds: `'Lunch with work tag'`, `'Lunch no tag'`, `'Dinner with work tag'`.
- Sets description `'Lunch'` and checks `'work'` tag.
- Submits.
- Asserts only `'Lunch with work tag'` appears (both conditions must match).

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
