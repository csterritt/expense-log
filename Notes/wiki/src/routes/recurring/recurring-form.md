# recurring-form.tsx

**Source:** `src/routes/recurring/recurring-form.tsx`

## Purpose

Shared renderer for the recurring-template entry / edit form (Issue 13). Both the create flow (`POST /recurring`) and the edit flow (`POST /recurring/:id/edit`) use the same field shape, sticky `value` bindings, and per-field error blocks.

## Exports

### `renderRecurringForm({ mode, action, state, payloads })`

Returns a JSX `<form>` (`data-testid='recurring-form'`, `noValidate`) with a responsive grid layout (`md:grid-cols-5`). Fields:

- **Description** — text input (`data-testid='recurring-form-description'`), max length from `descriptionMax`.
- **Amount** — text input with `inputMode='decimal'` (`data-testid='recurring-form-amount'`).
- **Category** — text input wired to the JS-on combobox (`data-category-combobox`, `data-testid='recurring-form-category'`).
- **Recurrence** — `<select>` (`data-testid='recurring-form-recurrence'`) populated from `VALID_RECURRENCES`.
- **Anchor date** — date input (`data-testid='recurring-form-anchor-date'`).
- **Tags** — text input wired to the JS-on chip picker (`data-tag-chip-picker`, `data-testid='recurring-form-tags'`).

Submit button label is `'Add recurring'` (`data-testid='recurring-form-create'`) in create mode or `'Save changes'` (`data-testid='recurring-form-save'`) in edit mode.

Each field has an associated error block (`data-testid='recurring-form-{field}-error'`) when `fieldErrors` contains a message for that key.

Two `<script type='application/json'>` blocks embed the categories and tags payloads as safely-escaped JSON for the progressive-enhancement scripts.

### Types

- `RecurringFormState` — `{ fieldErrors: FieldErrors, values: ExpenseFormValues }`
- `RecurringFormPayloads` — `{ categories: { name: string }[], tags: { name: string }[] }`
- `RecurringFormMode` — `'create' | 'edit'`
- `RenderRecurringFormProps` — combines mode, action, state, and payloads.

## Cross-references

- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `VALID_RECURRENCES`, `FieldErrors`, max-length constants.
- [../../lib/form-state.md](../../lib/form-state.md) — `ExpenseFormValues`.
- [build-create-recurring.md](build-create-recurring.md) — mounts this form in `mode='create'`.
- [build-edit-recurring.md](build-edit-recurring.md) — mounts this form in `mode='edit'`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
