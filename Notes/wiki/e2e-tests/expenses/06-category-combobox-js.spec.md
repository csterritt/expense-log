# 06-category-combobox-js.spec.ts

**Source:** `e2e-tests/expenses/06-category-combobox-js.spec.ts`

## Purpose

End-to-end coverage for the category combobox JavaScript-enhanced behavior on the expense entry form.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Uses [`seedCategories`](../support/db-helpers.md) to seed existing categories (`groceries`, `utilities`).
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Typing filters and ArrowDown+Enter selects an existing category

- Clicks category input and types `'gr'`.
- Asserts dropdown appears with `groceries` option visible, `utilities` not shown.
- Presses ArrowDown then Enter to select.
- Asserts input value is `'groceries'`.
- Fills description, amount, date and submits.
- Asserts expense row appears with category `'groceries'`.

### Typing a brand-new name surfaces the Create row and routes through confirmation

- Clicks category input and types `'rent'` (non-existent).
- Asserts Create row appears with text containing `'rent'`.
- Clicks Create row.
- Asserts input value is `'rent'`.
- Fills description, amount, date and submits.
- Asserts confirmation page appears with new category line.
- Confirms and asserts expense row appears with category `'rent'`.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
