# 01-summary-defaults-and-controls.spec.ts

**Source:** `e2e-tests/summary/01-summary-defaults-and-controls.spec.ts`

## Purpose

End-to-end coverage for the Issue 17 summary page default state, dimension switching, granularity switching, sorting, and the clear/reset flow.

## Test cases (10 total)

### `defaults to month granularity, category dimension`

- On first load with no query params, table shows `Category`, `Month`, `Count`, `Total` columns.
- Granularity selector defaults to `Month`.

### `switches to quarter granularity`

- Selects `Quarter` from granularity selector, clicks Apply.
- Table shows `Mmm-Mmm` time period labels.

### `switches to year granularity`

- Selects `Year` from granularity selector, clicks Apply.
- Table shows `YYYY` time period labels.

### `switches to time dimension`

- Selects `Time` from dimension selector, clicks Apply.
- Table shows only `Time Period`, `Count`, `Total` columns.

### `switches to tag dimension`

- Selects `Tag` from dimension selector, clicks Apply.
- Table shows `Tag`, `Time Period`, `Count`, `Total` columns.

### `switches to category-tag dimension`

- Selects `Category + Tag` from dimension selector, clicks Apply.
- Table shows `Category`, `Tag`, `Time Period`, `Count`, `Total` columns.

### `sortable column headers toggle direction`

- Clicking a column header once sorts ascending; clicking again sorts descending.
- Sort state is reflected in the query string.

### `tag note explains AND semantics`

- When tags exist, a note is visible explaining that multiple selected tags filter to expenses carrying **all** selected tags.

### `clear link resets to defaults`

- After applying filters, the Clear link navigates to `/summary` with no query params.
- Page returns to default dimension, granularity, and date range.

### `empty state message`

- When filters match no expenses, the table is hidden and a "No expenses match the selected filters." message appears.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../../src/lib/db/summary-access.md](../../src/lib/db/summary-access.md) — aggregation logic.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
