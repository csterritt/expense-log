# build-recurring.tsx

**Source:** `src/routes/build-recurring.tsx`

## Purpose

Placeholder route builder for the future recurring-expense-template page (`/recurring`). Behind the signed-in middleware.

## Export

### `buildRecurring(app): void`

Route: `GET /recurring`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='recurring-page'` wrapper
- `<h1>Recurring</h1>`
- Body text: `Recurring expense templates are coming soon.`

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.RECURRING`, `STANDARD_SECURE_HEADERS`

---

See [source-code.md](../../source-code.md) for the full catalog.
