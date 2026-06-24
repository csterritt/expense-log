# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Thin route orchestrator for the expenses page (`/expenses`). Issue 14B refactored the original monolithic file into this builder plus separate handler modules. All rendering, validation, and DB logic now lives in the delegated modules.

## Export

### `buildExpenses(app): void`

Registers three routes, all gated by `signedInAccess`:

- `GET /expenses` — `secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS)` (allows inline scripts for the category combobox + tag chip checkboxes), delegates to `handleExpensesGet`.
- `POST /expenses` — `secureHeaders(STANDARD_SECURE_HEADERS)`, delegates to `handleExpensesPost`.
- `POST /expenses/confirm-create-new` — `secureHeaders(STANDARD_SECURE_HEADERS)`, delegates to `handleExpensesConfirmPost`.

## Cross-references

- [expense-get-handler.md](expense-get-handler.md) — GET handler implementation.
- [expense-post-handler.md](expense-post-handler.md) — POST handler for expense creation.
- [expense-confirm-post-handler.md](expense-confirm-post-handler.md) — POST handler for confirmation submission.
- [expense-list-renderer.md](expense-list-renderer.md) — render functions for the expenses page.
- [expense-form.md](expense-form.md) — shared form and confirmation-page JSX.
- [expense-form-helpers.md](expense-form-helpers.md) — `readRawBody`, `emptyState` helpers.
- [../build-layout.md](../build-layout.md) — layout wrapper (used by handlers).
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`, `ALLOW_SCRIPTS_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
