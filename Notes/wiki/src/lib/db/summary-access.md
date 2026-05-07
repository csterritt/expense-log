# summary-access.ts

**Source:** `src/lib/db/summary-access.ts`

## Purpose

Read/write helpers for expense summaries. Uses the same `withRetry` + `Result` pattern as `auth-access.ts`.

**Note:** This module was split from `expense-access.ts` to improve modularity.

## Types

### `SummaryRow`

```ts
interface SummaryRow {
  dateKey: string
  categoryName: string
  tagName: string
  amountCents: number
  count: number
}
```

### `SummarizeFilters`

```ts
interface SummarizeFilters {
  from?: string
  to?: string
  categoryId?: string
  tagIds?: string[]
  tagMode?: 'or' | 'and'
  groupBy: 'month' | 'year'
}
```

## Exports

### `summarize(db, filters): Promise<Result<SummaryRow[], Error>>`

- Added in Issue 12. Public wrapper: `withRetry('summarize', () => summarizeActual(db, filters))`.
- Groups expenses by the specified `groupBy` key (month or year), category, and tag.
- Filters by:
  - `expense.date >= filters.from` (when provided)
  - `expense.date <= filters.to` (when provided)
  - `categoryId` exact match (when provided)
  - Tag filtering: when `tagIds` provided, uses subqueries on `expenseTag`:
    - `tagMode === 'and'`: expense must have all listed tags
    - `tagMode === 'or'` (default): expense must have at least one listed tag
- Returns rows with aggregated `amountCents` (sum) and `count` (number of expenses).
- Untagged expenses get `tagName` as empty string.
- Expenses with multiple tags produce one row per tag.
- Sorts by `dateKey ASC`, `categoryName ASC`, `tagName ASC`.
- Returns empty array when no expenses match filters.

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`
- [db/schema.md](../../db/schema.md) — `expense`, `category`, `tag`, and `expenseTag` tables.
- [et-date.md](../et-date.md) — `monthKeyEt` and `yearKeyEt` helpers.
- [expense-access.md](./expense-access.md) — expense operations (summary operations were moved from this file)
- [routes/build-summary.md](../../routes/build-summary.md) — summary page caller (Issue 12).

---

See [source-code.md](../../../source-code.md) for the full catalog.
