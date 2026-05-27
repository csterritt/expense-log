# tag-chip-checkboxes.spec.ts

**Source:** `tests/tag-chip-checkboxes.spec.ts`

## Purpose

Unit coverage for the `TagChipCheckboxes` component (`src/components/tag-chip-checkboxes.tsx`). Validates rendering, ordering, styling, XSS safety, and prop-driven behavior.

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`.
- Imports `TagChipCheckboxes` and constants directly from the TSX source.

## Test cases

### Basic rendering

- Renders one checkbox per tag when `allTags` has entries.
- Renders nothing when `allTags` is empty.

### Alphabetical ordering

- Tags are sorted case-insensitively: `['Zebra', 'apple', 'Banana']` → `apple`, `Banana`, `Zebra`.

### Selected vs unselected styling

- Tags in `selectedTagIds` receive `CHIP_CLASS_SELECTED` classes.
- Tags not in `selectedTagIds` receive `CHIP_CLASS_BASE` classes.

### XSS safety

- Tag names containing HTML metacharacters (e.g., `<script>alert(1)</script>`) are rendered as escaped text, not executed markup.

### `allowNewTags` prop

- When `true`, a `newTags` text input is rendered with `name='newTags'`.
- When `false` (or omitted), no `newTags` input is rendered.

### Empty tag list

- Renders an appropriate empty-state message or no chips when `allTags` is an empty array.

### Constant parity

- Asserts that `CHIP_CLASS_BASE` and `CHIP_CLASS_SELECTED` exported from the TSX component match the corresponding values in `public/js/tag-chip-checkboxes.js`, preventing drift between server-rendered and client-enhanced styling.

## Cross-references

- [../src/components/tag-chip-checkboxes.md](../src/components/tag-chip-checkboxes.md) — component under test.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
