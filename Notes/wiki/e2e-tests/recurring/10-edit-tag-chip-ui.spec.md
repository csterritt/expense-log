# 10-edit-tag-chip-ui.spec.ts

Recurring edit form — tag chip-checkbox UI tests.

## Coverage

### Pre-existing tag rendering

- Pre-existing tag attachments render as selected chips on initial load.
- All seeded tags appear as chip-checkboxes in alphabetical order with flex wrap.
- Selected chip is visually distinct from unselected chip on the edit form.
- Chip inputs have `name=tagId` and a valid ULID `value`.
- `new-tags-input` is present on the edit form.

### Toggling chips on save

- Toggling a chip off detaches the corresponding tag on save.
- Toggling a chip on adds that tag on save.
- Saving redirects to `/recurring` and the updated row reflects tag changes.

### New-tag confirmation flow

- Typing a new tag name reaches the recurring edit confirmation page (`confirm-recurring-edit-new-page`).

### Cancel and recovery

- Cancelling the confirmation preserves chip selections and `newTags` text.
- Returns to `/recurring/:id/edit` with form state intact.

## Helpers

- `todayEt()` — returns current ET date in `YYYY-MM-DD` format.
- `signInAndGoToEditRecurring(page, id)` — signs in and navigates to `/recurring/:id/edit`.

## Cross-references

- See [tag-chip-checkboxes.tsx](../../src/components/tag-chip-checkboxes.md) for the component under test.
- See [build-edit-recurring.tsx](../../src/routes/recurring/build-edit-recurring.md) for the edit flow.
