# 04-validation.spec.ts

**Source:** `e2e-tests/recurring/04-validation.spec.ts`

## Purpose

Issue 13 spec covering per-field validation on recurring template create and edit forms.

## Test cases

1. **Description over limit on create → error shown, no row created** — fills a description exceeding `descriptionMax`, submits, asserts `recurring-form-description-error` and no row created.
2. **Amount zero on create → error shown** — fills `0`, submits, asserts `recurring-form-amount-error`.
3. **Amount with three decimal places on create → error shown** — fills `1.234`, submits, asserts `recurring-form-amount-error`.
4. **Impossible anchor date 2025-02-30 on create → error shown** — fills invalid date, submits, asserts `recurring-form-anchorDate-error`.
5. **Typed values are preserved after validation failure on create** — fills multiple fields with one bad value, submits, asserts all typed values are still in the form.
6. **Amount zero on edit → error shown, row not mutated** — seeds a template, edits amount to `0`, submits, asserts `recurring-form-amount-error` and amount unchanged in list.
7. **Description over limit on edit → error shown, row not mutated** — seeds a template, edits description to exceed max, submits, asserts `recurring-form-description-error` and description unchanged in list.

## Cross-references

- [../../src/routes/recurring/build-create-recurring.md](../../src/routes/recurring/build-create-recurring.md) — create route under test.
- [../../src/routes/recurring/build-edit-recurring.md](../../src/routes/recurring/build-edit-recurring.md) — edit route under test.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedRecurringTemplates`.

