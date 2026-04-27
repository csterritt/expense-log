# tag-chip-picker.js

**Source:** `public/js/tag-chip-picker.js`

## Purpose

Vanilla-JS progressive-enhancement module for the expense entry form's tags input. When the page loads with JS enabled, the module finds the input marked with `data-tag-chip-picker`, reads the embedded tags JSON, hides the original CSV text field, and presents a chip-based UI with suggestions.

## Auto-init

- Listens for `DOMContentLoaded`.
- Queries `document.querySelectorAll('[data-tag-chip-picker]')`.
- Self-initialises once per matched element; guards against double-init by checking for an already-created wrapper.

## Data contract

- Reads `document.getElementById('embedded-tags-json')` (the `<script type="application/json">` tag emitted by `build-expenses.tsx`).
- Parses the JSON via `JSON.parse(script.textContent)` into an array of `{ id, name }` objects.

## Public `data-testid` surface

| Test ID | Element | Description |
|---------|---------|-------------|
| `tag-chip-picker-input` | The free-text input inside the chip picker | Receives typing for new tag names. |
| `tag-chip-picker-chips` | The `role="list"` chip container | Holds already-selected tags. |
| `tag-chip-picker-chip-N` | Individual chip (zero-based `N`) | Displays the tag name. |
| `tag-chip-picker-remove-N` | Remove button inside chip `N` | Click removes the chip. |
| `tag-chip-picker-suggestions` | The `role="listbox"` suggestion dropdown | Visible while typing a matching prefix. |
| `tag-chip-picker-suggestion-N` | Individual suggestion row (zero-based `N`) | Click or Enter adds it as a chip. |
| `tag-chip-picker-create-row` | The "Create ..." row in suggestions | Visible when the typed name does not exist yet. |

## Behaviour

### Adding chips

- **Click a suggestion** — adds the matching tag as a chip and clears the input.
- **Press Enter** — if a suggestion is highlighted, adds it; otherwise adds the raw typed text as a new chip (if non-empty and not a duplicate).
- **Type a comma** — splits on comma, trims each segment, drops empties, and adds each as a chip.
- Duplicate chips are silently ignored.

### Removing chips

- **Click the chip's remove button** — removes that chip and re-syncs the hidden input.
- **Press Backspace** in the empty input — removes the last chip and re-syncs the hidden input.

### Hidden input sync

- A hidden `<input name="tags">` is created (or updated) with a comma-separated list of all chip texts.
- The server receives the identical CSV payload whether JS is on (chips) or off (plain text), so `parseTagCsv` behaves the same in both cases.

### Filtering

- Suggestions are filtered by case-insensitive prefix match against the current input value.
- Already-selected tag names are excluded from suggestions.

### Keyboard navigation

- `ArrowDown` / `ArrowUp` — cycles through visible suggestions.
- `Enter` — adds the highlighted suggestion (or the raw text if nothing is highlighted).
- `Escape` — closes the suggestion dropdown.
- `Backspace` on empty input — removes the last chip.

### Accessibility

- Chip container has `role="list"`; each chip has `role="listitem"`.
- Suggestion dropdown has `role="listbox"`.
- Active suggestion has `aria-selected="true"`.

## Cross-references

- [../src/routes/expenses/build-expenses.md](../src/routes/expenses/build-expenses.md) — server-side page that embeds the JSON and loads this script deferred.
- [../e2e-tests/expenses/07-tag-chip-picker-js.spec.md](../e2e-tests/expenses/07-tag-chip-picker-js.spec.md) — Playwright tests covering add/remove, keyboard, and form submission.
