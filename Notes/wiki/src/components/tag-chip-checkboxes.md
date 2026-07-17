# src/components/tag-chip-checkboxes.tsx

Shared tag chip-checkbox component for mutation forms and filter forms. Renders tags as native server-rendered checkboxes styled as chips.

## Props

- `tags: { id: string, name: string }[]` — Available tags
- `selectedTagIds: Set<string>` — Currently selected tag IDs
- `allowNewTags: boolean` — Whether to show the "new tags" text input
- `newTagsValue?: string` — Pre-fill for new tags input (default: `''`)

## Behavior

- Tags sorted alphabetically (case-insensitive)
- Each tag rendered as a `<label>` with checkbox (`name='tagId'`) + name span
- Selected chips use `badge badge-soft badge-primary` class; unselected use `badge`
- When no tags exist and `allowNewTags` is false: renders empty fragment
- When `allowNewTags` is true: renders additional `newTags` text input (comma or space separated)

## Exported Constants

- `CHIP_CLASS_BASE` — `'badge cursor-pointer'`
- `CHIP_CLASS_SELECTED` — `'badge badge-soft badge-primary cursor-pointer'`
