# 08-no-js-fallback.spec.ts

**Source:** `e2e-tests/expenses/08-no-js-fallback.spec.ts`

## Purpose

End-to-end coverage for JavaScript-disabled fallback behavior on the expense entry form (Issue 5/6 server flow untouched).

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Manages DB lifecycle inline (clear, seed, clear sessions) instead of using `testWithDatabase` helper.
- Creates browser context with `javaScriptEnabled: false`.
- Uses [`seedExpenses`](../support/db-helpers.md) to seed expense with existing category `'food'` and tag `'groceries'`.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Test

### All-existing values submit directly; new values route through confirmation

- Asserts combobox dropdown and chip picker surface do not mount (JS off).
- Asserts category and tags inputs remain plain text inputs.
- Fills form with all-existing values (`'food'`, `'groceries'`) and submits.
- Asserts direct redirect to `/expenses` with no confirmation page.
- Asserts expense row appears with category and tags.
- Fills form with brand-new category `'rent'` and new tags `'utilities, monthly'` and submits.
- Asserts confirmation page appears.
- Confirms and asserts expense row appears with new category and tags.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
