# 03-summary-chip-and-sort.spec.ts

**Source:** `e2e-tests/summary/03-summary-chip-and-sort.spec.ts`

## Purpose

End-to-end coverage for the summary page chip-checkbox tag filter UI, chronological sort behavior, malformed-query fallback, dimension-aware sort allow-list, and untagged-expense exclusion under tag dimensions.

## Test cases (11 total)

### `tag filter uses chip-checkbox block (no <select multiple>), preserves name=tagId, has no new-tag input`

- Verifies no `select[multiple]` element exists for tag filtering.
- Verifies the shared `tag-chip-checkboxes` block is rendered.
- Every chip checkbox has `name="tagId"`.
- No `new-tags-input` is rendered (`allowNewTags=false` on summary filter form).

### `AND semantics across two selected tags`

- Seeds expenses with `work`, `personal`, and both tags.
- Clicks both `work` and `personal` chips, submits form.
- Only the expense carrying both tags appears (1 row, total $30.00).

### `Month-granularity table shows Mmm YYYY labels in chronological order`

- Seeds expenses in Jan–Apr 2026.
- Navigates with `granularity=month`.
- Asserts time period labels: `['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026']`.

### `Quarter-granularity table shows Mmm-Mmm YYYY labels in chronological order`

- Seeds expenses in Q1–Q4 2026.
- Navigates with `granularity=quarter`.
- Asserts time period labels: `['Jan-Mar 2026', 'Apr-Jun 2026', 'Jul-Sep 2026', 'Oct-Dec 2026']`.

### `clicking time-period header toggles to descending chronological (not reverse-alphabetical)`

- Seeds Jan–Mar 2026 expenses.
- Default ascending: `['Jan 2026', 'Feb 2026', 'Mar 2026']`.
- Clicks `summary-sort-timePeriod` header.
- Descending: `['Mar 2026', 'Feb 2026', 'Jan 2026']` (chronological, not alphabetical).

### `Dec 2025 and Jan 2026 produce two distinct rows with Dec 2025 first under default ascending`

- Seeds Dec 2025 and Jan 2026 expenses.
- Asserts cross-year chronological ordering: `['Dec 2025', 'Jan 2026']`.

### `malformed query params render with defaults and no 500`

- Navigates with bogus `dimension`, `granularity`, `sort`, `direction`, `tagId`, `from`, and `to` values.
- Page renders without 500 error.
- Controls fall back to defaults: `dimension=category`, `granularity=month`.

### `dimension=category with sort=tag falls back to default sort (dimension-aware allow-list)`

- Navigates with `dimension=category&sort=tag:asc`.
- Page renders; sort falls back to default (no `tag` sort column in category dimension).

### `untagged expenses contribute no rows under Tag or Category+Tag dimension`

- Seeds one tagged and one untagged expense.
- Navigates with `dimension=tag`.
- Only the tagged expense appears (1 row containing `work`).

### `untagged expenses contribute no rows under Category+Tag dimension`

- Same dataset as above.
- Navigates with `dimension=category-tag`.
- Only the tagged expense appears (1 row).

### `syntactically-valid-but-stale tagId values are silently omitted from rendered chip block`

- Navigates with a valid ULID that doesn't match any tag.
- Page renders normally.
- The stale tagId does not appear as a checked chip.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../../src/lib/db/summary-access.md](../../src/lib/db/summary-access.md) — aggregation logic.
- [../../src/components/tag-chip-checkboxes.md](../../src/components/tag-chip-checkboxes.md) — chip-checkbox component.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
