# 07-tag-chip-picker-js.spec.ts

**Source:** `e2e-tests/expenses/07-tag-chip-picker-js.spec.ts`

## Purpose

End-to-end coverage for the tag chip picker JavaScript-enhanced behavior on the expense entry form.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Uses [`seedExpenses`](../support/db-helpers.md) to seed an expense with existing tag `'groceries'`.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Add existing tag via Enter, create new tag via Create row, remove via × button

- Asserts chip picker surface is visible.
- Types `'gro'` in search input, ArrowDown then Enter to select existing `'groceries'` tag.
- Asserts chip appears and hidden input has value `'groceries'`.
- Types `'food'`, clicks Create row to create new tag.
- Asserts `'food'` chip appears and hidden input has value `'groceries,food'`.
- Clicks × button on `'groceries'` chip to remove it.
- Asserts `'groceries'` chip gone, hidden input has value `'food'`.
- Fills form and submits.
- Asserts confirmation page appears with new tag line.
- Confirms and asserts expense row appears with tag `'food'`.

### Pre-seeded form value rehydrates as chips after a validation-error round-trip

- Seeds `'food'` category for lookup.
- Adds two chips (`'groceries'`, `'rent'`) via picker.
- Fills invalid amount `'not-a-number'` to force server-side redirect with form-state.
- Submits and waits for redirect back to `/expenses`.
- Asserts form values restored including tags CSV.
- Asserts both chips rehydrated from preserved CSV value.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
