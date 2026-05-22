# build-summary.tsx

**Source:** `src/routes/build-summary.tsx`

## Purpose

Minimal placeholder for the `/summary` route. The full Issue 12 implementation (filter bar, summary table, DB queries, and grouping logic) was removed on 2026-05-22; the route now renders a "Summary coming soon" message behind the signed-in middleware.

## Export

### `buildSummary(app): void`

Route: `GET /summary`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### GET handler

Returns a simple JSX page wrapped in `useLayout`:
- `<div data-testid='summary-page'>`
- Heading: "Summary"
- Paragraph: "Summary coming soon"

No DB queries, no form parsing, no state management.

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.SUMMARY`, `STANDARD_SECURE_HEADERS`

---

See [source-code.md](../../source-code.md) for the full catalog.
