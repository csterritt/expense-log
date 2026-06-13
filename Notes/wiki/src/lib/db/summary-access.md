# summary-access.ts

**Source:** `src/lib/db/summary-access.ts`

## Purpose

Read/write helpers for expense summaries. Issue 17 re-introduced this file with a redesigned `summarize` function that supports four dimensions, three granularities, tag-AND filtering, and explicit sorting. Issue 18 adds chronological sort with internal `(year, monthIndex|quarterIndex)` keys and year-bearing labels (`Mmm YYYY` / `Mmm-Mmm YYYY` / `YYYY`). Uses the same `withRetry` + `Result` pattern as `auth-access.ts`.

## Exports

### `SummaryDimension`

One of `time`, `category`, `tag`, `category-tag`. Controls which columns appear in the result set and which SQL grouping keys are used.

### `SummaryGranularity`

One of `month`, `quarter`, `year`. Always present on the summary page; dictates how `timePeriod` labels are shaped (`Mmm YYYY`, `Mmm-Mmm YYYY`, or `YYYY`).

### `SummaryRow`

Shape is dimension-driven:

- `time`: `{ timePeriod: string; count: number; totalCents: number }`
- `category`: `{ timePeriod: string; categoryName: string; count: number; totalCents: number }`
- `tag`: `{ timePeriod: string; tagName: string; count: number; totalCents: number }`
- `category-tag`: `{ timePeriod: string; categoryName: string; tagName: string; count: number; totalCents: number }`

The internal `timePeriodKey` (numeric chronological key) is required during aggregation and sorting but is stripped before the row is returned as the public `SummaryRow`.

There is no grand total row and no percentage-of-total column.

### `summarize(db, opts): Promise<Result<SummaryRow[], Error>>`

Core aggregation function.

**Options:**

- `dimension`: which dimension to group by (see `SummaryDimension`)
- `granularity`: which time granularity to bucket into (see `SummaryGranularity`)
- `filters`: `{ from?, to?, tagIds? }`
  - `tagIds` are AND-semantic: only expenses carrying **all** listed tags are included.
- `sort`: optional array of `{ column, direction }` overrides. Defaults to group columns ascending (case-insensitive) then `timePeriod` ascending.

**Key behaviors:**

- Recurring templates participate only as materialized rows in `expense`; the `recurring` table itself is never queried for summary purposes.
- Zero-tag expenses are included in `time` and `category` dimensions but excluded from `tag` and `category-tag` dimensions.
- Multi-tagged expenses are double-counted in `tag` and `category-tag` dimensions (one row per matching tag).

**Chronological sort (Issue 18):**

- Each row carries an internal `timePeriodKey` alongside the rendered `timePeriod` label.
- Month granularity: `timePeriodKey = year * 100 + monthIndex` (0-based). `timePeriod` renders as `Mmm YYYY` (e.g. `Mar 2026`).
- Quarter granularity: `timePeriodKey = year * 10 + quarterIndex` (0-based). `timePeriod` renders as `Mmm-Mmm YYYY` (e.g. `Jan-Mar 2026`).
- Year granularity: `timePeriodKey = year`. `timePeriod` renders as `YYYY`.
- Default sort and explicit `timePeriod` sort both use the internal key; the rendered label is never compared.
- Sort by `count`, `total`, `category`, or `tag` breaks ties with default group-then-chronological-time-period ordering (`chronoCmp`).
- For `Category + Tag` dimension, clicked group-column tie-breakers are explicit: `sort=category` breaks ties on `tag asc` then `timePeriod asc`; `sort=tag` breaks ties on `category asc` then `timePeriod asc`.
- `Dec 2025` and `Jan 2026` with the same category produce two distinct rows (no cross-year aggregation), with `Dec 2025` sorting before `Jan 2026` in default ascending order.

## Cross-references

- [../et-date.md](../et-date.md) — provides `monthLabelEt`, `monthChronKeyEt`, `quarterLabelEt`, `quarterChronKeyEt`, `yearKeyEt`.
- [../../routes/build-summary.md](../../routes/build-summary.md) — route that calls `summarize`.
- [../../../tests/summary-access.spec.md](../../../tests/summary-access.spec.md) — unit coverage.

---

See [source-code.md](../../../source-code.md) for the full catalog.
