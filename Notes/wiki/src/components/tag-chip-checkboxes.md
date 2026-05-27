# tag-chip-checkboxes.tsx

**Source:** `src/components/tag-chip-checkboxes.tsx`

## Purpose

Shared React/JSX component that renders a set of tag chip-checkboxes for use in mutation forms (create, edit) and filter forms. Renders native server-rendered checkboxes styled as DaisyUI badge chips for progressive enhancement.

## Props

- `allTags` — array of `TagRecord` objects to render as chips
- `selectedTagIds` — `Set<string>` of ULID tag IDs that should be pre-checked
- `allowNewTags` — boolean; when `true`, renders an adjacent `newTags` text input for entering comma-separated new tag names

## Behavior

- Tags are sorted alphabetically by name (case-insensitive) before rendering.
- Each tag renders as a DaisyUI badge chip containing a native checkbox (`type='checkbox'`, `name='tagId'`, `value=<tag.id>`).
- Selected chips use `CHIP_CLASS_SELECTED` (primary badge style); unselected chips use `CHIP_CLASS_BASE` (outline badge style).
- When `allowNewTags` is true, a `newTags` text input is rendered below the chip row with `name='newTags'` and `data-testid='new-tags-input'`.

## Exported constants

- `CHIP_CLASS_BASE` — base CSS classes for unselected badge chips
- `CHIP_CLASS_SELECTED` — CSS classes for selected badge chips

Both constants are consumed by the progressive-enhancement JS module `public/js/tag-chip-checkboxes.js` to keep client-side styling in sync with server-side rendering.

## Cross-references

- [../../public-js/index.md](../../public-js/index.md) — progressive-enhancement JS modules (category combobox, tag chip picker, tag chip checkboxes)

---

See [source-code.md](../../source-code.md) for the full catalog.
