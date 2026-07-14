# 07-tag-chip-picker-js.spec.ts

**Source:** `e2e-tests/expenses/07-tag-chip-picker-js.spec.ts`

## Purpose

End-to-end coverage for the tag chip-checkbox JavaScript-enhanced behavior on the expense entry form (JS-on). Tests toggling existing tag chips and typing new tag names in the `newTags` input.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Uses [`seedExpenses`](../support/db-helpers.md) to seed an expense with existing tag `'groceries'`.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Toggle chip to select existing tag + type new tag, submit routes through confirmation

- Clicks the `'groceries'` chip to toggle its underlying checkbox on.
- Asserts the checkbox inside the chip is checked.
- Types `'food'` in the `newTags` text input.
- Fills the rest of the form and submits.
- Asserts `confirm-create-new-page` is visible with one `confirm-create-new-tag-line` listing `'food'`.
- Confirms and asserts the created expense row has tags `'food, groceries'` (alphabetical).

### Chip selections are preserved after a validation-error round-trip

- Seeds an expense with tags `'groceries'` and `'rent'`.
- Toggles both chips to select them.
- Fills invalid amount `'not-a-number'` to force server-side redirect with form-state.
- Submits and waits for redirect back to `/expenses`.
- Asserts both chip checkboxes are still checked after the round-trip.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
