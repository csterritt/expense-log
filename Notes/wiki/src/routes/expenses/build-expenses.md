# src/routes/expenses/build-expenses.tsx

Route builder for the expenses list page. Registers GET, POST, and confirm-create-new routes.

## Routes Registered

- `GET /expenses` — List expenses (with `ALLOW_SCRIPTS_SECURE_HEADERS` for category combobox JS)
- `POST /expenses` — Create expense (standard secure headers)
- `POST /expenses/confirm-create-new` — Confirm creation with new categories/tags

All routes require `signedInAccess` middleware.

## Dependencies

- `../../constants` — `PATHS`, `ALLOW_SCRIPTS_SECURE_HEADERS`, `STANDARD_SECURE_HEADERS`
- `../../middleware/signed-in-access` — auth guard
- `./expense-get-handler` — `handleExpensesGet`
- `./expense-post-handler` — `handleExpensesPost`
- `./expense-confirm-post-handler` — `handleExpensesConfirmPost`
