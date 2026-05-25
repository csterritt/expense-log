# summary-access.spec.ts

**Source:** `tests/summary-access.spec.ts`

## Purpose

Unit coverage for [`src/lib/db/summary-access.ts`](../src/lib/db/summary-access.md). Issue 17 re-introduced this spec for the redesigned `summarize` function. Uses an in-memory Bun SQLite database with manually created schema (no migrations) for fast, isolated tests.

## Setup

- In-memory SQLite database with `PRAGMA foreign_keys = ON`.
- Manual `CREATE TABLE` for `category`, `recurring`, `expense`, `tag`, `expenseTag`, `recurringTag` plus indexes.
- Local seed helpers: `seedCat`, `seedTag`, `seedExpense`, `seedExpenseTag`, `seedRecurring`.
- Shared dataset: `food`, `transport`, `utilities` categories; `travel`, `dining`, `work` tags; five expenses plus one materialized recurring row.

## Test cases (18 total)

### `summarize — dimension: time` (4 cases)

- Returns `timePeriod` but no `categoryName` or `tagName`.
- `month` granularity produces `Mmm` labels.
- `quarter` granularity produces `Mmm-Mmm` labels.
- `year` granularity produces `YYYY` labels.
- Aggregates `count` and `totalCents` within each time period.

### `summarize — dimension: category` (3 cases)

- Returns `categoryName` and `timePeriod` but no `tagName`.
- Groups by category and month, sums correctly per category.
- Includes zero-tag expenses (e.g. utilities with no tags).

### `summarize — dimension: tag` (3 cases)

- Returns `tagName` and `timePeriod` but no `categoryName`.
- Double-counts multi-tagged expenses under each tag.
- Excludes zero-tag expenses.

### `summarize — dimension: category-tag` (3 cases)

- Returns `categoryName`, `tagName`, and `timePeriod`.
- Excludes zero-tag expenses.
- Groups by category + tag + timePeriod.

### `summarize — tag-AND filter` (3 cases)

- Single-tag filter narrows to expenses carrying that tag.
- Two-tag AND filter keeps only expenses carrying both tags.
- Three-tag AND filter with no matches returns empty array.

### `summarize — empty filter set` (1 case)

- Returns empty array when date range matches nothing.

### `summarize — materialized recurring rows` (1 case)

- Materialized recurring expense counts exactly like a manual row.

### `summarize — default sort` (1 case)

- Default sort is group columns asc (case-insensitive) then `timePeriod` asc.

### `summarize — explicit sort override` (1 case)

- Sort by `totalCents` desc overrides the default.

## Cross-references

- [../src/lib/db/summary-access.md](../src/lib/db/summary-access.md) — module under test.
- [../src/lib/et-date.md](../src/lib/et-date.md) — provides `monthKeyEt`, `quarterKeyEt`, `yearKeyEt`.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
