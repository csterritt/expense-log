# expense-post-handler.ts

**Source:** `src/routes/expenses/expense-post-handler.ts`

## Purpose

POST handler for creating a new expense. Validates the form, resolves category and tag inputs, and either creates the expense directly or renders a confirmation page when new categories or tags need to be created.

## Flow

1. Reads the raw form body via `readRawBody`.
2. Validates description, amount, date, and category via `parseExpenseCreate`.
3. On validation failure, redirects back to `/expenses` with field errors and preserved raw values (including `tagIds` and `newTags`).
4. Fetches all tags from the database.
5. Parses tag inputs via `parseTagInputs` (handles both selected tag IDs and new tag names).
6. Validates that all submitted `tagId` values exist in the database (tamper protection).
7. Looks up the category by name. If it doesn't exist, the category is considered "new".
8. If no new category and no new tags, creates the expense directly via `createExpenseWithTags`.
9. If something is new, validates the new category name and renders the consolidated confirmation page (`confirm-create-new-page`) via `renderConfirmNewItems`.

## Key functions

- `handleExpensesPost(c)` — Main POST handler.

## Cross-references

- [expense-form-helpers.md](expense-form-helpers.md) — `readRawBody` helper.
- [expense-form.md](expense-form.md) — `renderConfirmNewItems` and form types.
- [expense-confirm-post-handler.md](expense-confirm-post-handler.md) — Handles the confirmation POST.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagInputs`.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `createExpenseWithTags`.
- [../../lib/db/category-access.md](../../lib/db/category-access.md) — `findCategoryByName`.
- [../../lib/db/tag-access.md](../../lib/db/tag-access.md) — `listTags`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
