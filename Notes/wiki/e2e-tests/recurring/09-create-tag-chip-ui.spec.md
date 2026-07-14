# 09-create-tag-chip-ui.spec.ts

Recurring create form — tag chip-checkbox UI tests.

## Coverage

### Tag chip rendering

- Every seeded tag appears as a chip-checkbox in alphabetical order with flex wrap.
- Selected chip is visually distinct from unselected chip (class change on click).
- Chip inputs have `name=tagId` and a valid ULID `value`.
- `new-tags-input` is present on the create form.

### Tag selection and submission

- Toggling two chips on and submitting attaches both tags to the new recurring template.
- The created template appears in the list with the correct tags.

### New-tag confirmation flow

- Typing a new tag name in the `newTags` input reaches the recurring confirmation page (`confirm-recurring-create-new-page`).

### Cancel and recovery

- Cancelling the confirmation preserves chip selections and `newTags` text.
- Returns to `/recurring/new` with form state intact.

## Helpers

- `todayEt()` — returns current ET date in `YYYY-MM-DD` format.
- `signInAndGoToNewRecurring(page)` — signs in and navigates to `/recurring/new`.

## Cross-references

- See [tag-chip-checkboxes.tsx](../../src/components/tag-chip-checkboxes.md) for the component under test.
- See [build-create-recurring.tsx](../../src/routes/recurring/build-create-recurring.md) for the create flow.
