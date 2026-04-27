# 06-category-combobox-js.spec.ts

**Source:** `e2e-tests/expenses/06-category-combobox-js.spec.ts`

## Purpose

Playwright end-to-end tests for the progressive-enhancement category combobox (JS-on scenario). Verifies that the client-side `category-combobox.js` module correctly filters the embedded category list, supports click and keyboard selection, and shows a "Create ..." row for unmatched names.

## Setup

- Uses `testWithDatabase` for DB isolation.
- Seeds `seedCategories(['Food', 'Transport', 'Utilities'])` before each test.
- Relies on JS being enabled (Playwright default).

## Test cases

### `filters and selects an existing category by click`

- Navigates to `/expenses`, types `ut` into the category input.
- Asserts the dropdown (`category-combobox-dropdown`) contains two visible options matching the substring.
- Clicks the first visible option.
- Asserts the input value is set to the clicked category name.
- Asserts the dropdown is hidden after selection.

### `selects a category by keyboard (ArrowDown + Enter)`

- Types `fo` into the category input.
- Presses `ArrowDown` to move focus into the dropdown and select the first option.
- Presses `Enter` to confirm the selection.
- Asserts the input value is set to the matching category.
- Asserts the dropdown is hidden.

### `shows "Create ..." row for unmatched names`

- Types a non-matching name (`NonexistentCategory`) into the category input.
- Asserts the dropdown contains a single `category-combobox-create-row` with the typed name.
- Clicks the create row.
- Asserts the input value is set to the typed name (the server-side confirmation flow handles actual creation).

## Cross-references

- [../../public-js/category-combobox.md](../../public-js/category-combobox.md) — the module under test.
- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — server-side page that embeds the JSON and loads the script.
