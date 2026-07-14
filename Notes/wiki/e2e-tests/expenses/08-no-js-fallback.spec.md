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

- Asserts combobox dropdown does not mount (JS off); category input remains a plain text input.
- Toggles the `'groceries'` chip (native checkbox, works without JS) and fills the rest of the form with existing category `'food'`.
- Asserts direct redirect to `/expenses` with no confirmation page.
- Asserts expense row appears with category and tags.
- Fills form with brand-new category `'rent'` and types `'utilities, monthly'` into `new-tags-input`.
- Asserts confirmation page appears.
- Confirms and asserts expense row appears with new category and tags.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
