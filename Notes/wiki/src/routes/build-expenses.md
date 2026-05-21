# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expenses page (`/expenses`). Refactored in Issue 14B to be a thin orchestrator that delegates to separate handler modules.

## Export

### `buildExpenses(app): void`

Registers three routes, all gated by `signedInAccess` and wrapped in `secureHeaders`:

- `GET /expenses` — delegates to `handleExpensesGet`.
- `POST /expenses` — delegates to `handleExpensesPost`.
- `POST /expenses/confirm-create-new` — delegates to `handleExpensesConfirmPost`.

All routes use `secureHeaders` and `signedInAccess` middleware.

## Cross-references

- [expense-get-handler.ts.md](expense-get-handler.ts.md) — GET handler implementation.
- [expense-post-handler.ts.md](expense-post-handler.ts.md) — POST handler for expense creation.
- [expense-confirm-post-handler.ts.md](expense-confirm-post-handler.ts.md) — POST handler for confirmation submission.
- [expense-list-renderer.tsx.md](expense-list-renderer.tsx.md) — render functions for the expenses page.
- [expense-form-helpers.ts.md](expense-form-helpers.ts.md) — form utility functions.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`, `ALLOW_SCRIPTS_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
