# 02-summary-tag-filter-and-recurring.spec.ts

**Source:** `e2e-tests/summary/02-summary-tag-filter-and-recurring.spec.ts`

## Purpose

End-to-end coverage for the Issue 17 summary page tag-AND filtering and recurring expense participation.

## Test cases (4 total)

### `single-tag filter narrows aggregation to expenses carrying that tag; column shape unchanged`

- Seeds expenses with `work` and `personal` tags across Food and Transport categories.
- Clicks the `work` chip, submits.
- Only Food and Transport categories appear (both have work-tagged expenses).
- Tag ID is preserved in the URL.

### `two-tag filter applies AND semantics — only expenses carrying both tags contribute`

- Seeds expenses with `work`, `personal`, and both tags.
- Clicks both `work` and `personal` chips, submits.
- Only the expense carrying both tags appears (1 row, total $30.00).

### `recurring template does not appear until materialized`

- A recurring template without a materialized row in the date range does not contribute to the summary.

### `materialized recurring row counts like manual expense`

- A materialized recurring row in the date range contributes its amount and count exactly like a manually created expense.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../../src/lib/db/summary-access.md](../../src/lib/db/summary-access.md) — aggregation logic.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
