# tag-chip-checkboxes.spec.ts

**Source:** `tests/tag-chip-checkboxes.spec.ts`

## Purpose

Unit coverage for the `TagChipCheckboxes` component (`src/components/tag-chip-checkboxes.tsx`). Validates rendering, ordering, styling, XSS safety, and prop-driven behavior.

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`.
- Imports `TagChipCheckboxes` and constants directly from the TSX source.

## Test cases

### Basic rendering

- Renders one checkbox per tag when `tags` has entries (asserts `name="tagId"`, each tag's `value`).
- Renders tag label text.
- Wraps chips with `flex-wrap` and `gap-2` classes.

### Alphabetical ordering

- Tags are sorted case-insensitively: `['Lego', 'food', 'Gift']` → `food`, `Gift`, `Lego`.

### Selected vs unselected styling

- Tags in `selectedTagIds` receive `checked` attribute and `CHIP_CLASS_SELECTED` class.
- Tags not in `selectedTagIds` do not have `checked`.
- HTML differs when a chip is selected vs none selected.

### XSS safety

- Tag names containing HTML metacharacters (e.g., `<script>alert(1)</script>`) are rendered as escaped text (`&lt;script&gt;`), not executed markup.

### `allowNewTags` prop

- When `true`, a `newTags` text input is rendered with `name='newTags'` and `type='text'`.
- When `false`, no `newTags` input is rendered.
- When `newTagsValue` is provided (e.g., `'coffee, tea'`), the input is pre-populated.

### Empty tag list

- With `allowNewTags=false`: renders no checkboxes and no `newTags` input.
- With `allowNewTags=true`: renders `newTags` input and a `'No tags yet'` empty-state hint.

### No-JS and dropdown-free

- Uses native `type="checkbox"` inputs, not `<select>` or `role="listbox"`.

### Constant parity

- Asserts that `CHIP_CLASS_BASE` and `CHIP_CLASS_SELECTED` exported from the TSX component match the corresponding `const` declarations in `public/js/tag-chip-checkboxes.js`, preventing drift between server-rendered and client-enhanced styling.

## Cross-references

- [../src/components/tag-chip-checkboxes.md](../src/components/tag-chip-checkboxes.md) — component under test.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
