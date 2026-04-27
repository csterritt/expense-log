# category-combobox.js

**Source:** `public/js/category-combobox.js`

## Purpose

Vanilla-JS progressive-enhancement module for the expense entry form's category input. When the page loads with JS enabled, the module finds the input marked with `data-category-combobox`, reads the embedded categories JSON, and replaces the plain text experience with an accessible filtered dropdown.

## Auto-init

- Listens for `DOMContentLoaded`.
- Queries `document.querySelectorAll('[data-category-combobox]')`.
- Self-initialises once per matched element; guards against double-init by checking for an already-created wrapper.

## Data contract

- Reads `document.getElementById('embedded-categories-json')` (the `<script type="application/json">` tag emitted by `build-expenses.tsx`).
- Parses the JSON via `JSON.parse(script.textContent)` into an array of `{ id, name }` objects.

## Public `data-testid` surface

| Test ID | Element | Description |
|---------|---------|-------------|
| `category-combobox-input` | The enhanced text input (replaces the original) | Receives focus and typing. |
| `category-combobox-dropdown` | The `role="listbox"` container | Shown/hidden as the user types. |
| `category-combobox-option-N` | Each matching option row | Zero-based index `N` for keyboard selection. |
| `category-combobox-create-row` | The "Create ..." row | Visible only when no existing category matches the typed text. |

## Behaviour

### Filtering

- Case-insensitive substring match on `category.name` against the current input value.
- If the input is empty or whitespace, the dropdown is hidden.

### Selection (click)

- Clicking any option or the create row writes the selected name into the **original** `<input name="category">` (the one the server expects) and hides the dropdown.
- The enhanced input mirrors the selected value for visual consistency.

### Keyboard navigation

- `ArrowDown` — opens the dropdown (if closed) and moves visual focus to the first option.
- `ArrowUp` / `ArrowDown` — cycles through visible options.
- `Enter` — selects the currently highlighted option and hides the dropdown.
- `Escape` — closes the dropdown without changing the value.
- `Tab` / blur — closes the dropdown; if an exact single match exists, it is auto-selected.

### Accessibility

- Dropdown container has `role="listbox"`.
- Active option has `aria-selected="true"`.
- Input has `aria-autocomplete="list"` and `aria-controls` pointing to the dropdown.

## Cross-references

- [../src/routes/expenses/build-expenses.md](../src/routes/expenses/build-expenses.md) — server-side page that embeds the JSON and loads this script deferred.
- [../e2e-tests/expenses/06-category-combobox-js.spec.md](../e2e-tests/expenses/06-category-combobox-js.spec.md) — Playwright tests covering filtering, keyboard, and creation.
