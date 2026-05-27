# expense-form-helpers.ts

**Source:** `src/routes/expenses/expense-form-helpers.ts`

## Purpose

Shared helper functions for expense form handling: creating empty form state and reading/parsing the raw form body.

## Exported functions

- `emptyState(today: string): ExpenseFormState` — Returns an empty form state with default values. All fields are empty strings except `tagIds` (empty array) and `date` (set to `today`).
- `readRawBody(c)` — Reads and parses the raw form body from a Hono request. Handles:
  - `tagId` as either an array (from checkboxes) or a single string, filtering out non-string values.
  - All other fields as strings with empty-string fallback.
  - Returns an object with: `description`, `amount`, `date`, `category`, `tags` (legacy), `tagId` (string array), `newTags`, `action`.

## Cross-references

- [expense-form.md](expense-form.md) — `ExpenseFormState` type definition.
- [expense-post-handler.md](expense-post-handler.md) — Uses `readRawBody`.
- [expense-confirm-post-handler.md](expense-confirm-post-handler.md) — Uses `readRawBody`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
