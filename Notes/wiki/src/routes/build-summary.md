# build-summary.tsx

**Source:** `src/routes/build-summary.tsx`

## Purpose

Placeholder route builder for the future expense-summary page (`/summary`). Behind the signed-in middleware.

## Export

### `buildSummary(app): void`

Route: `GET /summary`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='summary-page'` wrapper
- `<h1>Summary</h1>`
- Body text: `Expense summaries are coming soon.`

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.SUMMARY`, `STANDARD_SECURE_HEADERS`

---

See [source-code.md](../../source-code.md) for the full catalog.
