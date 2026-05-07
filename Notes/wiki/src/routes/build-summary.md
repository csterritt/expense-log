# build-summary.tsx

**Source:** `src/routes/build-summary.tsx`

## Purpose

Full implementation of the expense-summary page (`/summary`) added in Issue 12. Displays aggregated expense data grouped by date (month or year), with optional filtering by category and tags. Behind the signed-in middleware.

## Export

### `buildSummary(app): void`

Route: `GET /summary`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### GET handler

1. Creates a DB client via `createDbClient(c.env.PROJECT_DB)`.
2. Reads the raw query string via `c.req.query()`.
3. Parses via `parseSummaryQuery(rawQuery)`:
   - On `Err`: renders the filter bar with defaults and an empty table, showing field errors.
   - On `Ok`: calls `summarize(db, parsed.value)` in parallel with `listCategories(db)` and `listTags(db)`.
4. Renders the page with:
   - A filter bar (`FilterBar` component) with:
     - Group-by selector (`month` / `year`, default `month`)
     - From/To date inputs (default to 2-month ET window)
     - Category dropdown (All + seeded categories)
     - Tag checkboxes (when tags exist) with Any/All mode radios
     - Apply button
     - Field-level error rendering
   - A summary table (`SummaryTable` component) with:
     - Columns: Date, Category, Tag, Total, Count
     - Grand total row at the footer
     - Empty state when no expenses match filters
5. All inputs use `value`/`selected`/`checked` (not `defaultValue`/`defaultChecked`) to preserve state across submissions.
6. Form uses GET submission so state lives in the URL.

### Components

#### `FilterBar({ categories, tags, active, errors })`

Renders a DaisyUI card with:
- Group-by `<select>` with `summary-group-by` testid
- From date input with `summary-from` testid
- To date input with `summary-to` testid
- Category dropdown with `summary-category` testid
- Tag badges (checkboxes) with `summary-tag-{id}` testids
- Tag mode radios with `summary-tag-mode-or`/`summary-tag-mode-and` testids
- Apply button with `summary-apply-filters` testid
- Field-level error rendering under relevant controls

#### `SummaryTable({ rows })`

Renders:
- Empty state with `summary-empty` testid when `rows.length === 0`
- DaisyUI table with columns: Date, Category, Tag, Total, Count
- Each row has `summary-row` testid with per-column testids
- Grand total footer with `summary-grand-total` and `summary-grand-count` testids
- Uses `formatCents` from `lib/money.ts` for currency formatting

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.SUMMARY`, `STANDARD_SECURE_HEADERS`
- [db/expense-access.md](../lib/db/expense-access.md) — `summarize`, `listCategories`, `listTags` helpers
- [expense-validators.md](../lib/expense-validators.md) — `parseSummaryQuery` validator
- [money.md](../lib/money.md) — `formatCents` formatter
- [et-date.md](../lib/et-date.md) — `defaultRangeEt` for default date window

---

See [source-code.md](../../source-code.md) for the full catalog.
