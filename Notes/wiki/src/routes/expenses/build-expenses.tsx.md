# src/routes/expenses/build-expenses.tsx

Route builder for the expenses list page. Refactored in Issue 14B to be a thin orchestrator that delegates to separate handler modules.

## Purpose

Exports `buildExpenses(app)` which registers three expense routes with the Hono app:
- `GET /expenses` — expense list with entry form and filters
- `POST /expenses` — expense creation (with confirmation flow for new categories/tags)
- `POST /expenses/confirm-create-new` — confirmation form submission

After the Issue 14B refactoring, this file is now a thin orchestrator that:
- Imports the three handler functions from separate modules
- Registers them with the Hono app along with middleware (secureHeaders, signedInAccess)
- Keeps the `CONFIRM_CREATE_NEW_PATH` constant used across handlers

## Exports

### `buildExpenses(app)`

Function that takes a Hono app instance and registers the expense routes:
- GET handler: `handleExpensesGet` (from `expense-get-handler.ts`)
- POST handler: `handleExpensesPost` (from `expense-post-handler.ts`)
- Confirm POST handler: `handleExpensesConfirmPost` (from `expense-confirm-post-handler.ts`)

All routes use `secureHeaders` middleware and `signedInAccess` middleware.

## Constants

- `CONFIRM_CREATE_NEW_PATH = '/expenses/confirm-create-new'` — path for the confirmation form, shared between the POST handler and the confirm POST handler

## Dependencies

- `hono` — `Hono` type
- `hono/secure-headers` — `secureHeaders`
- `../../constants` — `ALLOW_SCRIPTS_SECURE_HEADERS`, `PATHS`, `STANDARD_SECURE_HEADERS`
- `../../local-types` — `Bindings` type
- `../../middleware/signed-in-access` — `signedInAccess`
- `./expense-get-handler` — `handleExpensesGet`
- `./expense-post-handler` — `handleExpensesPost`
- `./expense-confirm-post-handler` — `handleExpensesConfirmPost`

## Refactoring history

**Issue 14B (2026-05-08)**: Refactored from a 597-line monolithic file into a thin orchestrator plus five separate modules:
- `expense-list-renderer.tsx` — render functions (filter bar, table, page layout)
- `expense-form-helpers.ts` — form utilities (emptyState, readRawBody)
- `expense-get-handler.ts` — GET route logic
- `expense-post-handler.ts` — POST route logic for expense creation
- `expense-confirm-post-handler.ts` — POST route logic for confirmation submission

The refactoring preserved the public API (`buildExpenses` function signature) and all existing functionality while improving code organization and separation of concerns.

## Cross-references

- See [expense-list-renderer.tsx](./expense-list-renderer.tsx.md) — render functions for the expenses page
- See [expense-form-helpers.ts](./expense-form-helpers.ts.md) — form utility functions
- See [expense-get-handler.ts](./expense-get-handler.ts.md) — GET handler implementation
- See [expense-post-handler.ts](./expense-post-handler.ts.md) — POST handler for expense creation
- See [expense-confirm-post-handler.ts](./expense-confirm-post-handler.ts.md) — POST handler for confirmation
