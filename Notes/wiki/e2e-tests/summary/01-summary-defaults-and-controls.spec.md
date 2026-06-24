# 01-summary-defaults-and-controls.spec.ts

**Source:** `e2e-tests/summary/01-summary-defaults-and-controls.spec.ts`

## Purpose

End-to-end coverage for the Issue 17 summary page default state, dimension switching, granularity switching, sorting, and the clear/reset flow.

## Test cases (8 total)

### `(a) first visit shows Category dimension, Month granularity, controls visible, no grand-total row, no percent column`

- On first load with no query params, dimension defaults to `category`, granularity defaults to `month`.
- All controls visible: dimension selector, granularity selector, tag chip block, date range inputs, submit and clear buttons.
- Column headers: `Category`, `Time Period`, `Count`, `Total` present; no `Tag` column.
- No grand-total row (`summary-total` absent) and no percent column.

### `(b) switching dimension to Time only drops category/tag columns; switching to Tag adds tag column; switching to Category+Tag adds both`

- Switches dimension to `time` → category and tag columns disappear, time-period column remains.
- Switches dimension to `tag` → tag column appears, category column absent.
- Switches dimension to `category-tag` → both category and tag columns appear.

### `(c) switching granularity to Quarter shows Mmm-Mmm labels; Year shows YYYY labels`

- Switches granularity to `quarter` → time period labels match `^(Jan-Mar|Apr-Jun|Jul-Sep|Oct-Dec) \d{4}$`.
- Switches granularity to `year` → time period labels match `^\d{4}$`.

### `(d) clicking a column header toggles the sort indicator and re-orders rows`

- Clicks `summary-sort-category` header; URL contains `sort=` param.
- Clicks again; URL changes (direction toggled).

### `(e) tag-related inline note appears for Tag and Category+Tag dimensions, absent otherwise`

- Default Category dimension — no `summary-tag-note`.
- Switch to Tag — note appears.
- Switch to Category+Tag — note still appears.
- Switch to Time only — note gone.

### `(f) Clear link resets controls to first-load defaults`

- Changes dimension to `time` and granularity to `year`, submits.
- Clicks Clear; dimension back to `category`, granularity back to `month`.
- URL is plain `/summary` with no query params.

### `(g) date range that yields no rows shows empty-state message`

- Sets date range to 2000-01-01 through 2000-01-31, submits.
- `summary-empty` is visible; no `summary-row` elements.

### `default sort is category ascending then time-period ascending (no percent column)`

- Category column values are sorted ascending (case-insensitive).
- No `summary-sort-percent` element present.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../../src/lib/db/summary-access.md](../../src/lib/db/summary-access.md) — aggregation logic.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
