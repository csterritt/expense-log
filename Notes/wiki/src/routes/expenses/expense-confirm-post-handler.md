# expense-confirm-post-handler.ts

**Source:** `src/routes/expenses/expense-confirm-post-handler.ts`

## Purpose

POST handler for the expense creation confirmation page (`/expenses/confirm-create-new`). Handles both "confirm" and "cancel" actions, defensively re-validates all fields, and atomically creates the expense with any new categories and tags.

## Flow

1. Reads the raw form body via `readRawBody`.
2. If `action === 'cancel'`, redirects back to `/expenses` with all raw values preserved (no DB writes).
3. Defensively re-validates description, amount, date, and category (tamper protection on hidden inputs).
4. Fetches all tags and parses tag inputs via `parseTagInputs`.
5. Looks up the category. If it doesn't exist, validates the new category name.
6. Calls `createManyAndExpense` to atomically create any new category, new tags, and the expense with links.
7. On collision failure (race condition), surfaces the error under `category` or `tags` field.
8. On success, redirects to `/expenses` with success message.

## Key functions

- `handleExpensesConfirmPost(c)` — Main confirmation POST handler.

## Cross-references

- [expense-form-helpers.md](expense-form-helpers.md) — `readRawBody` helper.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagInputs`.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `createManyAndExpense`.
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
