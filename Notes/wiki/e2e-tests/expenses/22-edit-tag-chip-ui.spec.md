# 22-edit-tag-chip-ui.spec.ts

**Source:** `e2e-tests/expenses/22-edit-tag-chip-ui.spec.ts`

## Purpose

End-to-end tests for the tag chip-checkbox UI on the expense edit form. Verifies that pre-existing tag attachments render as selected chips, chips toggle correctly, and tag changes persist on save.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Pre-existing tag attachments render as selected chips on initial load

- Seeds an expense tagged with `food` and `gift`.
- Opens the edit form and asserts both `tag-chip-food` and `tag-chip-gift` checkboxes are checked.

### All seeded tags appear as chip-checkboxes in alphabetical order with wrap

- Seeds an expense with 4 tags (`food`, `gift`, `lego`, `restaurant`).
- Asserts 4 chips are visible, sorted alphabetically (case-insensitive), with `display: flex`.

### Selected chip is visually distinct from unselected chip on edit form

- Seeds an expense with `food` and `gift` tags (both pre-selected).
- Toggles `food` off, then asserts its CSS class changed while `gift` class stayed the same.

### Toggling a chip off detaches the corresponding tag on save

- Seeds a multi-tag expense (`food`, `gift`).
- Toggles `food` off, saves, and asserts the expense row shows only `gift`.

### Toggling a chip on adds that tag on save

- Seeds a single-tag expense (`food`, `gift`).
- Toggles `food` off then on again, saves, and asserts both tags remain.

### Chip inputs have name=tagId and value=ULID on the edit form

- Seeds a tagged expense, opens edit form.
- Asserts checkbox inputs have `name="tagId"` and `value` matching ULID regex.

### New-tag input is present on the edit form

- Seeds a tagged expense, opens edit form.
- Asserts `new-tags-input` testid is visible.

## Cross-references

- [../../src/routes/expenses/build-edit-expense.md](../../src/routes/expenses/build-edit-expense.md) — route under test.
- [../../src/components/tag-chip-checkboxes.md](../../src/components/tag-chip-checkboxes.md) — shared chip-checkbox component.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
