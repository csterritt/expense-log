# expense-confirm-post-handler.ts

**Source:** `src/routes/expenses/expense-confirm-post-handler.ts`

## Purpose

POST handler for the expense creation confirmation page (`/expenses/confirm-create-new`). Handles both "confirm" and "cancel" actions, defensively re-validates all fields, and atomically creates the expense with any new categories and tags. Issue 18: consumes `resolveConfirmTagsAndCategory` from `confirm-helpers.ts` for race-tolerant tag/category resolution.

## Flow

1. Reads the raw form body via `readRawBody`.
2. If `action === 'cancel'`, redirects back to `/expenses` with all raw values preserved (including `tagIds` and `newTags`) — no DB writes.
3. Defensively re-validates description, amount, date, and category via `parseExpenseCreate` (tamper protection on hidden inputs).
4. Calls `resolveConfirmTagsAndCategory(db, tagIds, newTags, category)` which:
   - Fetches the full tag list and parses tag inputs via `parseTagInputs`.
   - Looks up the category via `findCategoryByName`.
   - When the category is new, validates it via `parseNewCategoryName`.
5. Calls `createManyAndExpense` to atomically create any new category, new tags, and the expense with links.
6. On collision failure (race condition), surfaces the error under `category` or `tags` field.
7. On success, redirects to `/expenses` with success message.

## Key functions

- `handleExpensesConfirmPost(c)` — Main confirmation POST handler.

## Cross-references

- [expense-form-helpers.md](expense-form-helpers.md) — `readRawBody` helper.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseExpenseCreate`, `parseTagInputs`.
- [../../lib/db/confirm-helpers.md](../../lib/db/confirm-helpers.md) — `resolveConfirmTagsAndCategory` (Issue 18 shared pipeline).
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `createManyAndExpense`.
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`.
- [../../lib/confirmation-hmac.md](../../lib/confirmation-hmac.md) — HMAC signing utilities for confirmation payload integrity.

---

See [source-code.md](../../../source-code.md) for the full catalog.
