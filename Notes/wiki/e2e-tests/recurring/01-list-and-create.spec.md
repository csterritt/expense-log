# 01-list-and-create.spec.ts

**Source:** `e2e-tests/recurring/01-list-and-create.spec.ts`

## Purpose

Issue 13 spec covering the recurring templates list page empty state, create flow with new items (confirmation page), and create flow with existing items (direct save).

## Test cases

1. **Empty state shows no-templates message and new-recurring link** — signs in, navigates to `/recurring`, asserts `recurring-page`, `recurring-empty`, and `recurring-new` are visible.
2. **Create with new category and new tag routes through confirmation then appears in list** — fills the recurring form with a brand-new category and tag, submits, asserts landing on `confirm-recurring-create-new-page` with all preview fields (description, amount, recurrence, anchor date) visible. Confirms, asserts redirect to `/recurring` and the row shows all fields including correctly computed next occurrence.
3. **Create with existing category and existing tag skips confirmation and appears sorted** — seeds an existing template, fills the form with an existing category/tag, submits, asserts direct redirect to `/recurring` with two rows sorted alphabetically by description.

## Cross-references

- [../../src/routes/build-recurring.md](../../src/routes/build-recurring.md) — list route under test.
- [../../src/routes/recurring/build-create-recurring.md](../../src/routes/recurring/build-create-recurring.md) — create route under test.
- [../../src/routes/recurring/recurring-form.md](../../src/routes/recurring/recurring-form.md) — form renderer.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedRecurringTemplates`.

