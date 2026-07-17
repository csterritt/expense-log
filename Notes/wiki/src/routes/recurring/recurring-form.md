# src/routes/recurring/recurring-form.tsx

Shared renderer for the recurring template create/edit form. Similar to `expense-form.tsx` but with additional recurrence and anchor date fields.

## Types

- `RecurringFormState` — `{ fieldErrors: FieldErrors, values: ExpenseFormValues }`
- `RecurringFormPayloads` — `{ categories: { name }[], tags: { id, name }[] }`
- `RecurringFormMode` — `'create' | 'edit'`
- `RenderRecurringFormProps` — `{ mode, action, state, payloads }`

## Functions

### renderRecurringForm(props): JSX

Renders the recurring form with:
- Description input
- Amount input (decimal mode)
- Category combobox (datalist with existing categories)
- Tag chip checkboxes + new tags text input
- Recurrence select (Monthly, Quarterly, Yearly)
- Anchor date input
- Submit button (label depends on mode)
- Embedded `<script>` with category data for combobox JS

## Internal Helpers

- `fieldError(field, message)` — renders error `<p>`
- `inputClass(base, hasError)` — adds `input-error` class
- `safeJsonForScript(data)` — safe JSON for `<script>` embedding

## Dependencies

- `../../lib/expense-validators` — `categoryNameMax`, `descriptionMax`, `VALID_RECURRENCES`, `FieldErrors`
- `../../lib/form-state` — `ExpenseFormValues`
- `../../components/tag-chip-checkboxes` — `TagChipCheckboxes`
