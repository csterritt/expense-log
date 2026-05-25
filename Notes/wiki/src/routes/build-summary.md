# build-summary.tsx

**Source:** `src/routes/build-summary.tsx`

## Purpose

Issue 17 re-implemented the `/summary` route with a redesigned aggregation UI. The page supports four grouping dimensions, three time granularities, tag-AND filtering, sortable columns, and a clear-reset flow. There are no grand total or percentage-of-total rows.

## Export

### `buildSummary(app): void`

Route: `GET /summary`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### GET handler

1. Parses query string via `parseSummaryQuery`. On validation errors, the route still renders (with error indicators) rather than short-circuiting.
2. Calls `summarize(db, parsed)` and `listTags(db)` in parallel.
3. Renders `ControlsForm` (filters) and `ResultsTable` (aggregated rows) inside `useLayout`.

### ControlsForm

A filter bar with:

- **Dimension selector** — `time`, `category`, `tag`, `category-tag`.
- **Granularity selector** — always visible; `month`, `quarter`, `year`.
- **Date range** — optional `from` and `to` inputs.
- **Tag checkboxes** — list of existing tags; selecting multiple applies AND semantics.
- **Apply button** — submits the form via GET.
- **Clear link** — navigates to `/summary` with no query parameters, resetting all filters to defaults.

When tags are present, a note explains that selecting multiple tags filters to expenses carrying **all** selected tags.

### ResultsTable

Column shape is dimension-driven:

- `time`: Time Period | Count | Total
- `category`: Category | Time Period | Count | Total
- `tag`: Tag | Time Period | Count | Total
- `category-tag`: Category | Tag | Time Period | Count | Total

**Time period labels:**

- `month` granularity → `Mmm` (e.g. `Jan`)
- `quarter` granularity → `Mmm-Mmm` (e.g. `Jan-Mar`)
- `year` granularity → `YYYY` (e.g. `2026`)

**Sortable headers:** every non-numeric column header is a link that toggles ascending/descending sort. Sort state is persisted in the query string via `sort=column:direction` params. Numeric `Count` and `Total` columns are also sortable. Default sort is group columns ascending (case-insensitive) then `timePeriod` ascending.

**Empty state:** when no rows match, the table is replaced with a message: "No expenses match the selected filters."

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.SUMMARY`, `STANDARD_SECURE_HEADERS`
- [../lib/db/summary-access.md](../lib/db/summary-access.md) — `summarize` aggregation logic
- [../lib/expense-validators.md](../lib/expense-validators.md) — `parseSummaryQuery` validator
- [../../e2e-tests/summary/01-summary-defaults-and-controls.spec.md](../../e2e-tests/summary/01-summary-defaults-and-controls.spec.md) — E2E coverage for defaults, controls, sorting
- [../../e2e-tests/summary/02-summary-tag-filter-and-recurring.spec.md](../../e2e-tests/summary/02-summary-tag-filter-and-recurring.spec.md) — E2E coverage for tag filtering and recurring rows

---

See [source-code.md](../../source-code.md) for the full catalog.
