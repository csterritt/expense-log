# 03-delete.spec.ts

**Source:** `e2e-tests/recurring/03-delete.spec.ts`

## Purpose

Issue 13 spec covering the recurring template delete flow: cancel preserves the template, confirm removes the template but preserves past generated expenses (with `recurringId` nulled).

## Test cases

1. **Cancel on delete page returns to edit and template is still listed** — seeds a template, navigates to its delete page, clicks `confirm-delete-recurring-cancel`, asserts redirect back to edit page, asserts template still appears in the list.
2. **Confirm delete removes template but preserves past generated expense** — seeds a template and a generated expense linked to it via `seedGeneratedExpense`, verifies the expense is visible on `/expenses`, deletes the template, asserts template is gone from `/recurring`, asserts the past expense still exists on `/expenses`.

## Cross-references

- [../../src/routes/recurring/build-edit-recurring.md](../../src/routes/recurring/build-edit-recurring.md) — delete routes under test.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedRecurringTemplates`, `seedGeneratedExpense`.

