# Investigating recurring "New" button — Internal Server Error

## Date
2026-06-22

## Symptom
When navigating to the Recurring page and clicking "New Recurring", the browser
displays "Internal Server Error". The server log shows:

```
ReferenceError: listTags is not defined
```

The e2e test `e2e-tests/recurring/01-list-and-create.spec.ts` also fails at the
step that clicks the "New Recurring" button and expects the form page to load.

## Root cause
`src/routes/recurring/build-create-recurring.tsx` references `listTags` (and
several other functions) without importing them. The GET `/recurring/new`
handler calls `listTags(db)` on line 99, but `listTags` is never imported at the
top of the file.

The sibling file `src/routes/recurring/build-edit-recurring.tsx` imports all of
these correctly, confirming that the create file simply lost (or never had) the
import statements.

### Missing imports in `build-create-recurring.tsx`

| Symbol | Source module | Used on |
|---|---|---|
| `listTags` | `../../lib/db/tag-access` | lines 99, 176 |
| `findCategoryByName` | `../../lib/db/category-access` | line 198 |
| `parseTagInputs` | `../../lib/expense-validators` | line 181 |
| `parseNewCategoryName` | `../../lib/expense-validators` | line 227 |

The `listTags` error surfaces first because it is hit in the GET handler. The
other three would also throw `ReferenceError` once the POST handler is reached.

## Proposed solution
Add the missing import statements to `build-create-recurring.tsx`, matching the
pattern already used in `build-edit-recurring.tsx`:

1. Add `listTags` to a new import from `../../lib/db/tag-access`.
2. Add `findCategoryByName` to the existing `../../lib/db/category-access` import.
3. Add `parseTagInputs` and `parseNewCategoryName` to the existing
   `../../lib/expense-validators` import.

No logic changes are needed — only import declarations.
