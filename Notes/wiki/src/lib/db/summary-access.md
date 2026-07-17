# src/lib/db/summary-access.ts

Read helpers for expense summary aggregation. Groups expenses by time period, category, tag, or category-tag combination.

## Types

- `SummaryDimension` — `'time' | 'category' | 'tag' | 'category-tag'`
- `SummaryGranularity` — `'month' | 'quarter' | 'year'`
- `SummarizeFilters` — from, to, tagIds[]
- `SummarizeSort` — column, direction
- `SummarizeInput` — dimension, granularity, filters, sort[]
- `SummaryRow` — timePeriod, categoryName?, tagName?, count, totalCents

## Functions

### summarize(db, input): Result\<SummaryRow[], Error\>

Aggregates expenses into summary rows:

1. Builds WHERE conditions from date range (from/to) and tag-AND filter
2. Fetches expense rows with category names
3. If dimension needs tags (tag or category-tag), fetches tag associations
4. Groups rows by dimension + time period using a Map accumulator
5. Sorts by provided sort criteria or defaults to category → tag → chronological

Time period labels computed via `et-date` helpers: `monthLabelEt`, `quarterLabelEt`, `yearKeyEt`.

Sort column mapping: `category` → `categoryName`, `tag` → `tagName`, `total` → `totalCents`, `timePeriod` → chronological key.

## Dependencies

- `drizzle-orm` — query builders
- `true-myth/result` — Result type
- `../../db/schema` — `category`, `expense`, `expenseTag`, `tag`
- `../../local-types` — `DrizzleClient`
- `../db-helpers` — `withRetry`
- `../et-date` — `monthChronKeyEt`, `monthLabelEt`, `quarterChronKeyEt`, `quarterLabelEt`, `yearKeyEt`
