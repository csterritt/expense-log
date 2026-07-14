# build-recurring.tsx

**Source:** `src/routes/build-recurring.tsx`

## Purpose

Route builder for the recurring templates list page (`/recurring`). Issue 13 replaced the placeholder with a real page that calls `listRecurring`, renders a DaisyUI table with Description, Amount, Category, Tags, Recurrence, Anchor date, and Next occurrence columns. Next occurrence is computed via `nextOccurrenceAfter`; Quarterly/Yearly fall back to `—` until Issue 14.

## Export

### `buildRecurring(app): void`

Route: `GET /recurring`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='recurring-page'` wrapper.
- Header with `<h1>Recurring</h1>` and a `New recurring` button (`data-testid='recurring-new'` linking to `/recurring/new`).
- Empty state: `No recurring templates yet.` (`data-testid='recurring-empty'`) when no templates exist.
- Table (`table table-zebra`) with rows (`data-testid='recurring-row'`) containing:
  - `recurring-row-description`
  - `recurring-row-amount` (formatted via `formatCents`)
  - `recurring-row-category`
  - `recurring-row-tags`
  - `recurring-row-recurrence`
  - `recurring-row-anchor-date`
  - `recurring-row-next-occurrence`
  - Edit link (`data-testid='recurring-row-edit'`) per row.

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper.
- [recurring/build-create-recurring.md](recurring/build-create-recurring.md) — create flow linked from `recurring-new`.
- [recurring/build-edit-recurring.md](recurring/build-edit-recurring.md) — edit flow linked from `recurring-row-edit`.
- [../lib/db/expense-access.md](../lib/db/expense-access.md) — `listRecurring`.
- [../lib/recurrence.md](../lib/recurrence.md) — `nextOccurrenceAfter`.
- [../lib/money.md](../lib/money.md) — `formatCents`.
- [../lib/et-date.md](../lib/et-date.md) — `todayEt`.
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate.
- [constants.md](../constants.md) — `PATHS.RECURRING`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../source-code.md) for the full catalog.
