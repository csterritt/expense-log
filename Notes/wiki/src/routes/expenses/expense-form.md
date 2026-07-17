# src/routes/expenses/expense-form.tsx

Shared renderer for the expense entry/edit form. Used by both create and edit flows.

## Types

- `ExpenseFormState` — `{ fieldErrors: FieldErrors, values: ExpenseFormValues }`
- `ExpenseFormPayloads` — `{ categories: { name }[], tags: { id, name }[] }`
- `ExpenseFormMode` — `'create' | 'edit'`
- `RenderExpenseFormProps` — `{ mode, action, state, payloads }`

## Functions

### renderExpenseForm(props): JSX

Renders the expense form with:
- Description input (with error display)
- Amount input (decimal mode, with error display)
- Date input
- Category combobox (datalist with existing categories, allows new names)
- Tag chip checkboxes (existing tags) + new tags text input
- Submit button (label depends on mode: "Add expense" / "Save changes")
- Embedded `<script>` with category data for the combobox JS (JSON safely escaped)

### renderConfirmNewItems(props): JSX

Renders a confirmation page when new category names or new tag names are detected. Shows:
- Summary of what will be created (new category, new tags)
- Hidden form fields preserving all values
- Confirm and Cancel buttons

## Internal Helpers

- `fieldError(field, message)` — renders error `<p>` for a field
- `inputClass(base, hasError)` — adds `input-error` class when error present
- `safeJsonForScript(data)` — JSON.stringify with `<`, `>`, `&` escaped for safe `<script>` embedding

## Dependencies

- `../../lib/expense-validators` — `categoryNameMax`, `descriptionMax`, `FieldErrors`
- `../../lib/form-state` — `ExpenseFormValues`
- `../../components/tag-chip-checkboxes` — `TagChipCheckboxes`
