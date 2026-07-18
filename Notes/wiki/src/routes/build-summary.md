# src/routes/build-summary.tsx

Route builder for the expense summary page. Provides dimension/grouping controls, tag filters, and sortable summary table.

## Routes Registered

- `GET /summary` — Summary page with controls form and results table

## Key Features

- Dimensions: time only, category, tag, category-tag
- Granularity: month, quarter, year
- Filters: date range (from/to), tag selection (AND mode)
- Sortable columns: timePeriod, category, tag, total (with toggle asc/desc)
- URL state serialized via query params
- Uses `TagChipCheckboxes` component for tag filter UI

## Sub-components

- `SortLink` — renders a sortable column header with direction indicator
- `ControlsForm` — dimension/granularity/date range/tag filter form

## Dependencies

- `../lib/db/summary-access` — `summarize`, `SummaryRow`
- `../lib/db/tag-access` — `listTags`, `TagRow`
- `../lib/expense-validators` — `parseSummaryQuery`, `SummaryQueryResult`
- `../lib/et-date` — `defaultRangeEt`
- `../lib/money` — `formatCents`
- `../components/tag-chip-checkboxes` — `TagChipCheckboxes`
- `../middleware/signed-in-access` — auth guard
- `./build-layout` — `useLayout`
