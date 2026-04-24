# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expense list page (`/expenses`) — the post-sign-in landing page that replaced the legacy `/private` route. Currently a placeholder rendering an empty-state message; will host the expense list as the feature is built out.

## Export

### `buildExpenses(app): void`

Route: `GET /expenses`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='expenses-page'` wrapper
- `<h1>Expenses</h1>`
- Empty-state paragraph `data-testid='expenses-empty-state'` with text `No expenses yet`

## Cross-references

- [../build-layout.md](../build-layout.md) — layout wrapper
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`
- [../auth/better-auth-response-interceptor.md](../auth/better-auth-response-interceptor.md) — redirects verified sign-ins here
- [../../lib/auth.md](../../lib/auth.md) — `redirectTo: '/expenses'` in better-auth config

---

See [source-code.md](../../../source-code.md) for the full catalog.
