# 02-edit.spec.ts

**Source:** `e2e-tests/recurring/02-edit.spec.ts`

## Purpose

Issue 13 spec covering the recurring template edit flow: pre-population, simple save, new-tag confirmation, and cancel preservation.

## Test cases

1. **Edit page pre-populates fields and simple save updates the row** — seeds a template, clicks `recurring-row-edit`, asserts all form fields match the seeded values, changes the amount, saves, asserts redirect to `/recurring` with updated amount.
2. **Adding a new tag routes through confirm-edit-new and updates the row** — seeds a template, appends a new tag on the edit form, submits, lands on `confirm-recurring-edit-new-page`, confirms, asserts the list shows both old and new tags.
3. **Cancel on confirm-edit-new page returns to edit page with typed values preserved** — seeds a template, changes category and tag to trigger confirmation, clicks cancel, asserts redirect back to edit page with typed values intact, and asserts the original category is unchanged in the list.

## Cross-references

- [../../src/routes/recurring/build-edit-recurring.md](../../src/routes/recurring/build-edit-recurring.md) — route under test.
- [../../src/routes/recurring/recurring-form.md](../../src/routes/recurring/recurring-form.md) — form renderer.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedRecurringTemplates`.

