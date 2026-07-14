# expense-form.tsx

**Source:** `src/routes/expenses/expense-form.tsx`

## Purpose

Shared JSX renderer for the expense entry / edit form and for the consolidated *Confirm new items* page. Extracted in Issue 08 so the create flow (`POST /expenses`) and the edit flow (`POST /expenses/:id/edit`) share the same field shape, sticky `value` bindings, and error blocks. Updated for the tag chip-checkbox refactor: tags are now rendered via the `TagChipCheckboxes` component instead of a CSV text input.

## Exports

### `renderExpenseForm({ mode, action, state, payloads }): JSX.Element`

- `mode: 'create' | 'edit'` — drives the submit button label (`Add expense` vs `Save changes`) and its `data-testid` (`expense-form-create` vs `expense-form-save`).
- `action` — form `action` attribute. `/expenses` for create; `/expenses/:id/edit` for edit.
- `state: { fieldErrors, values }` — rendered errors per field plus sticky `value=` bindings (never `defaultValue`).
- `payloads: { categories: [{ name }], tags: [{ id, name }] }` — categories JSON is still emitted for the JS-on combobox; tags are now passed to `TagChipCheckboxes` directly.
- Form is `noValidate`. The category input still uses `data-category-combobox` for progressive enhancement.
- Tags section renders `<TagChipCheckboxes tags={payloads.tags} selectedTagIds={new Set(values.tagIds ?? [])} allowNewTags={true} newTagsValue={values.newTags ?? ''} />`.
- All field testids (`expense-form-{description,amount,date,category}` and matching `-error` suffixes) are mode-agnostic.

### `renderConfirmNewItems({ mode, entity, action, newCategoryName, finalCategoryName, newTagNames, finalTagNames, values }): JSX.Element`

- `mode: 'create' | 'edit'` — picks the testid prefix: `confirm-create-new-*` for create, `confirm-edit-new-*` for edit.
- `entity?: 'expense' | 'recurring'` — defaults to `'expense'`. When `'recurring'`, uses `confirm-recurring-{create|edit}-new-*` prefixes and adds `recurrence` / `anchorDate` hidden inputs.
- `action` — confirm/cancel form POST target.
- The list section renders zero-or-one `Create category 'name'` line (when `newCategoryName !== null`) followed by zero-or-more alphabetised `Create tag 'name'` lines.
- The summary `<dl>` mirrors the typed fields verbatim plus the alphabetised `finalCategoryName` and `finalTagNames`.
- The form's two submit buttons share `name='action'` with values `'confirm'` and `'cancel'`. Hidden inputs round-trip the **raw** typed values (`description`, `amount`, `date`, `category`, `tagId` array, `newTags`) so Cancel restores the entry/edit form byte-for-byte.

### `safeJsonForScript(data): string` (private)

Escapes `<`, `>`, and `&` to `\uXXXX` so a stray `</script>` in the JSON cannot break out of the embedded `<script>` element.

## Cross-references

- [build-expenses.md](build-expenses.md) — calls `renderExpenseForm({ mode: 'create' })` and `renderConfirmNewItems({ mode: 'create' })`.
- [build-edit-expense.md](build-edit-expense.md) — calls `renderExpenseForm({ mode: 'edit' })` and `renderConfirmNewItems({ mode: 'edit' })`.
- [../../components/tag-chip-checkboxes.md](../../components/tag-chip-checkboxes.md) — the `TagChipCheckboxes` component used for tag selection.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `descriptionMax`, `categoryNameMax`, `tagNameMax`, `FieldErrors`.
- [../../lib/form-state.md](../../lib/form-state.md) — `ExpenseFormValues` shape rendered by both helpers.
- [../../public-js/index.md](../../public-js/index.md) — consumer of `categories-data` and the `data-category-combobox` hook.
- [expense-list-renderer.md](expense-list-renderer.md) — imports `renderExpenseForm`, `ExpenseFormPayloads`, `ExpenseFormState` types.
- [expense-form-helpers.md](expense-form-helpers.md) — imports `ExpenseFormState` type.

---

See [source-code.md](../../../source-code.md) for the full catalog.
