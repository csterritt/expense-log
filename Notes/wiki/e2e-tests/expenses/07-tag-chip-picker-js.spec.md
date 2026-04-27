# 07-tag-chip-picker-js.spec.ts

**Source:** `e2e-tests/expenses/07-tag-chip-picker-js.spec.ts`

## Purpose

Playwright end-to-end tests for the progressive-enhancement tag chip picker (JS-on scenario). Verifies that the client-side `tag-chip-picker.js` module correctly renders chips, shows filtered suggestions, adds and removes chips via click and keyboard, and keeps the hidden input in sync for form submission.

## Setup

- Uses `testWithDatabase` for DB isolation.
- Seeds `seedCategories(['Food'])` plus a `POST /test/database/seed-tags` call to create `['food', 'fun', 'urgent']` before each test.
- Relies on JS being enabled (Playwright default).

## Test cases

### `adds chips by click and by keyboard comma`

- Navigates to `/expenses`, clicks the tags input.
- Types `fo`, clicks the first suggestion (`food`).
- Asserts a `tag-chip-picker-chip-0` chip is visible with text `food`.
- Types `ur`, presses `Enter` to select the first suggestion (`urgent`).
- Asserts a second chip `urgent` is visible.
- Asserts the hidden input value matches the comma-separated chip list (`food,urgent`).

### `removes chips by click and by Backspace`

- Adds two chips (`food`, `fun`) via suggestion clicks.
- Clicks the first chip's `tag-chip-picker-remove-0` button.
- Asserts only one chip (`fun`) remains.
- Focuses the input and presses `Backspace`.
- Asserts no chips are visible.
- Asserts the hidden input value is empty.

### `submits form with chips present`

- Fills the rest of the form (description, amount, date, category).
- Adds two chips (`food`, `fun`).
- Clicks the submit button.
- Waits for navigation to `/expenses` (PRG redirect).
- Asserts the first expense row contains both tag names in `expense-row-tags`.

## Cross-references

- [../../public-js/tag-chip-picker.md](../../public-js/tag-chip-picker.md) — the module under test.
- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — server-side page that embeds the JSON and loads the script.
