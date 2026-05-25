# 02-summary-tag-filter-and-recurring.spec.ts

**Source:** `e2e-tests/summary/02-summary-tag-filter-and-recurring.spec.ts`

## Purpose

End-to-end coverage for the Issue 17 summary page tag-AND filtering and recurring expense participation.

## Test cases (5 total)

### `single tag filter narrows results`

- Selects one tag checkbox, clicks Apply.
- Table includes only expenses carrying that tag.
- Expenses with multiple matching tags still appear once per applicable group.

### `multi-tag AND filter narrows further`

- Selects two tag checkboxes, clicks Apply.
- Table includes only expenses carrying **both** selected tags.

### `three-tag AND filter can return empty`

- Selects three tags that no single expense carries simultaneously.
- Empty state message is shown.

### `recurring template does not appear until materialized`

- A recurring template without a materialized row in the date range does not contribute to the summary.

### `materialized recurring row counts like manual expense`

- A materialized recurring row in the date range contributes its amount and count exactly like a manually created expense.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../../src/lib/db/summary-access.md](../../src/lib/db/summary-access.md) — aggregation logic.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
