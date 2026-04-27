# 08-no-js-fallback.spec.ts

**Source:** `e2e-tests/expenses/08-no-js-fallback.spec.ts`

## Purpose

Playwright end-to-end smoke test for the no-JS fallback path. Verifies that when `javaScriptEnabled: false`, the category and tags inputs remain plain text fields, the form submits successfully with server-side parsing, and the resulting expense row renders correctly.

## Setup

- Uses `testWithDatabase` for DB isolation.
- Calls `test.use({ javaScriptEnabled: false })` at the top of the file so every test in the suite runs with a browser context that disables JS.
- Seeds `seedCategories(['food'])` before the test.

## Test cases

### `category and tags inputs remain plain text and form submits successfully`

1. Signs in via `submitSignInForm` and navigates to `/expenses`.
2. Asserts the category input (`expense-form-category`) has `type='text'` and does **not** have `role='combobox'`.
3. Asserts the tags input (`expense-form-tags`) has `type='text'` and the chip-picker container (`tag-chip-picker-chips`) is not visible.
4. Fills the form with plain-text values: description, amount, category `food`, tags `plain, text, tags`.
5. Clicks submit and waits for the PRG redirect back to `/expenses`.
6. Asserts the first expense row shows description `No-JS expense`, amount `56.78`, and the tags cell contains each of the three plain-text tag names.

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — server-side form that degrades to plain text inputs when JS is unavailable.
- [../../public-js/category-combobox.md](../../public-js/category-combobox.md) and [../../public-js/tag-chip-picker.md](../../public-js/tag-chip-picker.md) — the JS modules that are absent in this scenario.
