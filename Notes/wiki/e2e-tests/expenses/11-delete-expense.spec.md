# 11-delete-expense.spec.ts

**Source:** `e2e-tests/expenses/11-delete-expense.spec.ts`

## Purpose

Issue 08 spec covering the delete-confirmation flow (`/expenses/:id/delete`). Pinned to `javaScriptEnabled: false`.

## Test cases

1. **Cancel from delete page returns to edit and makes no changes** — clicks `expense-edit-delete` from the edit page, asserts the `confirm-delete-expense-page` renders the seeded row's date, description, formatted amount (`formatCents`), category name, and tags. Clicks `confirm-delete-expense-cancel`; asserts redirect back to `/expenses/:id/edit` and that the row still exists on `/expenses`.
2. **Confirm deletes the expense and removes its row from the list** — seeds two rows, edits the "Weekly shop" row, clicks Delete then Confirm; asserts redirect to `/expenses`, the "Weekly shop" row is gone, and the second row remains untouched.
3. **Unknown id on delete GET redirects** — visits `/expenses/no-such-id/delete`; asserts a redirect to `/expenses` with no confirmation page rendered.

## Cross-references

- [../../src/routes/expenses/build-edit-expense.md](../../src/routes/expenses/build-edit-expense.md) — `GET /expenses/:id/delete` and `POST /expenses/:id/delete`.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — `deleteExpense`.
