# expense-form.tsx

**Source:** `src/routes/expenses/expense-form.tsx`

## Purpose

Shared JSX renderer for the expense entry / edit form and for the consolidated *Confirm new items* page. Extracted in Issue 08 so the create flow (`POST /expenses`) and the edit flow (`POST /expenses/:id/edit`) share the same field shape, sticky `value` bindings, error blocks, JSON-payload `<script>` blocks, and combobox / chip-picker hooks.

## Exports

### `renderExpenseForm({ mode, action, state, payloads }): JSX.Element`

- `mode: 'create' | 'edit'` — drives the submit button label (`Add expense` vs `Save changes`) and its `data-testid` (`expense-form-create` vs `expense-form-save`).
- `action` — form `action` attribute. `/expenses` for create; `/expenses/:id/edit` for edit.
- `state: { fieldErrors, values }` — rendered errors per field plus sticky `value=` bindings (never `defaultValue`).
- `payloads: { categories: [{ name }], tags: [{ name }] }` — emitted as two `<script type='application/json'>` blocks with stable testids `categories-data` / `tags-data` (used by the JS-on combobox + chip picker).
- Form is `noValidate` and uses `data-category-combobox` / `data-tag-chip-picker` data-attribute hooks for progressive enhancement.
- All field testids (`expense-form-{description,amount,date,category,tags}` and matching `-error` suffixes) are mode-agnostic.

### `renderConfirmNewItems({ mode, action, newCategoryName, finalCategoryName, newTagNames, finalTagNames, values }): JSX.Element`

- `mode: 'create' | 'edit'` — picks the testid prefix: `confirm-create-new-*` for create, `confirm-edit-new-*` for edit (page wrapper, list, list lines, summary `<dd>`s, form, Confirm/Cancel buttons).
- `action` — confirm/cancel form POST target. `/expenses/confirm-create-new` for create; `/expenses/:id/confirm-edit-new` for edit (the id rides in the URL — no extra hidden input needed).
- The list section renders zero-or-one `Create category 'name'` line (when `newCategoryName !== null`) followed by zero-or-more alphabetised `Create tag 'name'` lines.
- The summary `<dl>` mirrors the typed fields verbatim plus the alphabetised `finalCategoryName` and `finalTagNames`.
- The form's two submit buttons share `name='action'` with values `'confirm'` and `'cancel'`. Hidden inputs round-trip the **raw** typed values (`description`, `amount`, `date`, `category`, `tags`) so Cancel restores the entry/edit form byte-for-byte.

### `safeJsonForScript(data): string` (private)

Escapes `<`, `>`, and `&` to `\uXXXX` so a stray `</script>` in the JSON cannot break out of the embedded `<script>` element.

## Cross-references

- [build-expenses.md](build-expenses.md) — calls `renderExpenseForm({ mode: 'create' })` and `renderConfirmNewItems({ mode: 'create' })`.
- [build-edit-expense.md](build-edit-expense.md) — calls `renderExpenseForm({ mode: 'edit' })` and `renderConfirmNewItems({ mode: 'edit' })`.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `descriptionMax`, `categoryNameMax`, `tagNameMax`, `FieldErrors`.
- [../../lib/form-state.md](../../lib/form-state.md) — `ExpenseFormValues` shape rendered by both helpers.
- [../../public-js/index.md](../../public-js/index.md) — consumers of `categories-data` / `tags-data` and the `data-category-combobox` / `data-tag-chip-picker` hooks.

---

See [source-code.md](../../../source-code.md) for the full catalog.
