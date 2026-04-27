# Progressive Enhancement Overview

## Purpose

This page documents the client-side progressive enhancement layer added to the expense entry form on `/expenses`. The design follows the principle that the server-side validation, creation, and confirmation flows (Issues 05–06) work identically whether JavaScript is enabled or disabled. When JS is available, two vanilla-JS modules enhance the category and tags inputs for a richer UX; when JS is unavailable, the inputs remain plain `type='text'` fields and the server handles everything.

## Embedded JSON contract

The GET handler in `src/routes/expenses/build-expenses.tsx` fetches the full category and tag lists from the database and embeds them directly in the rendered HTML as JSON inside `<script type="application/json">` tags:

- `data-testid="embedded-categories-json"` — array of `{ id, name }` category rows, sorted case-insensitively by `lower(name)`.
- `data-testid="embedded-tags-json"` — array of `{ id, name }` tag rows, sorted alphabetically by `name`.

Both tags carry an `id` attribute (`embedded-categories-json`, `embedded-tags-json`) so the deferred client-side modules can locate them with `document.getElementById(...)` and parse the JSON without issuing an extra HTTP request.

## `data-*` auto-init hooks

The server renders two attributes that act as PE hooks:

- `data-category-combobox` on the category `<input name="category">`
- `data-tag-chip-picker` on the tags `<input name="tags">`

On `DOMContentLoaded`, `category-combobox.js` and `tag-chip-picker.js` query for these attributes and self-initialise. If an attribute is missing (or JS is disabled), the modules do nothing and the inputs stay plain text.

## Client-side modules (`public/js/`)

### `category-combobox.js`

Replaces the category text input with a filtered dropdown:
- Reads the embedded categories JSON.
- Substring-filters the list as the user types.
- Supports click and keyboard (ArrowDown/ArrowUp/Enter/Escape) selection.
- Shows a "Create ..." row when the typed text does not match any existing category.
- Writes the final selected name back to the original `<input name="category">` so the POST payload is unchanged.

See [public-js/category-combobox.md](public-js/category-combobox.md) for the full public `data-testid` surface and keyboard behaviour.

### `tag-chip-picker.js`

Replaces the tags CSV text input with a chip + suggestion UI:
- Reads the embedded tags JSON.
- Renders already-selected tags as removable chips (`role="list"`).
- Shows a suggestion dropdown (`role="listbox"`) filtered by prefix match.
- Adds chips via click, Enter, or comma-separated typing.
- Removes chips via click on the remove button or Backspace in the empty input.
- Keeps a hidden `<input name="tags">` synchronised with a comma-separated list so the server receives the same payload as the no-JS path.

See [public-js/tag-chip-picker.md](public-js/tag-chip-picker.md) for the full public `data-testid` surface and keyboard behaviour.

## Script loading strategy

The two `<script src="/js/..." defer>` tags are appended at the end of the rendered tree in `build-expenses.tsx` (after the layout footer). This ensures:

1. The DOM is fully parsed before the modules run.
2. The embedded JSON scripts are already in the document when the modules query for them.
3. The modules are loaded **only on the `/expenses` page**, not globally.

## Progressive-enhancement guarantee

The server-side code in `build-expenses.tsx` and `expense-access.ts` never branches on whether JS is present. The same validation, confirmation, and creation logic runs in both cases because:

- The enhanced UIs write back to the original input names (`category`, `tags`).
- The hidden tags input contains the identical comma-separated format that the plain text field would have submitted.
- All validation (`parseExpenseCreate`, `parseTagCsv`, `parseNewCategoryName`) and DB helpers (`createExpenseWithTags`, `createManyAndExpense`) remain server-side only.
- The no-JS fallback is exercised automatically by any browser with JS disabled, and explicitly by the `08-no-js-fallback.spec.ts` Playwright test.

## Cross-references

- [src/routes/expenses/build-expenses.md](src/routes/expenses/build-expenses.md) — server-side route that embeds JSON, renders the hooks, and loads the deferred scripts.
- [src/lib/db/expense-access.md](src/lib/db/expense-access.md) — `listCategories` and `listTags` helpers that supply the embedded data.
- [e2e-tests/expenses/06-category-combobox-js.spec.md](e2e-tests/expenses/06-category-combobox-js.spec.md) — JS-on E2E for the category combobox.
- [e2e-tests/expenses/07-tag-chip-picker-js.spec.md](e2e-tests/expenses/07-tag-chip-picker-js.spec.md) — JS-on E2E for the tag chip picker.
- [e2e-tests/expenses/08-no-js-fallback.spec.md](e2e-tests/expenses/08-no-js-fallback.spec.md) — JS-off smoke test.
