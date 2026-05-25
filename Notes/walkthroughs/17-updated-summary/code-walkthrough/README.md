# Issue 17 Updated Summary — Code Walkthrough

*2026-05-26T01:36:15Z by Showboat 0.6.1*
<!-- showboat-id: 8290dca5-1a35-4334-8b3b-f566623a8b9f -->

This walkthrough explains the Issue 17 updated summary page implementation, which re-introduces the /summary route with four dimensions, three granularities, tag-AND filtering, sortable columns, and no grand totals.

The implementation touches four main source files and three test files:

1. src/lib/et-date.ts — Added quarterKeyEt and re-introduced monthKeyEt/yearKeyEt with Mmm/YYYY output

2. src/lib/db/summary-access.ts — Re-implemented summarize with four dimensions, three granularities, and tag-AND filtering

3. src/lib/expense-validators.ts — Re-introduced parseSummaryQuery with dimension, granularity, sort, and tag-AND validation

4. src/routes/build-summary.tsx — Full route implementation replacing the placeholder

Let's examine the new and updated date key helpers in et-date.ts:

```bash
grep -n 'export const monthKeyEt' /home/chris/expense-log/src/lib/et-date.ts && grep -n 'export const quarterKeyEt' /home/chris/expense-log/src/lib/et-date.ts && grep -n 'export const yearKeyEt' /home/chris/expense-log/src/lib/et-date.ts
```

```output
90:export const monthKeyEt = (ymd: string): string => {
99:export const quarterKeyEt = (ymd: string): string => {
108:export const yearKeyEt = (ymd: string): string => {
```

```bash
grep -A 6 'export const monthKeyEt' /home/chris/expense-log/src/lib/et-date.ts
```

```output
export const monthKeyEt = (ymd: string): string => {
  const month = parsedMonth(ymd)
  return MONTH_NAMES[month - 1]
}

/**
 * Returns the calendar-quarter label `Mmm-Mmm` for a `YYYY-MM-DD` ET-anchored
```

monthKeyEt returns the three-letter month abbreviation (e.g. 'Jan'). quarterKeyEt returns the quarter label (e.g. 'Jan-Mar'). yearKeyEt returns the four-digit year. All three reuse isValidYmd validation:

```bash
sed -n '85,117p' /home/chris/expense-log/src/lib/et-date.ts
```

```output

/**
 * Returns the capitalized three-letter month abbreviation for a `YYYY-MM-DD`
 * ET-anchored date string (e.g. `'Jan'`).
 */
export const monthKeyEt = (ymd: string): string => {
  const month = parsedMonth(ymd)
  return MONTH_NAMES[month - 1]
}

/**
 * Returns the calendar-quarter label `Mmm-Mmm` for a `YYYY-MM-DD` ET-anchored
 * date string (one of `'Jan-Mar'`, `'Apr-Jun'`, `'Jul-Sep'`, `'Oct-Dec'`).
 */
export const quarterKeyEt = (ymd: string): string => {
  const month = parsedMonth(ymd)
  return QUARTER_LABELS[Math.ceil(month / 3) - 1]
}

/**
 * Returns the four-digit year string for a `YYYY-MM-DD` ET-anchored date
 * string (e.g. `'2026'`).
 */
export const yearKeyEt = (ymd: string): string => {
  parsedMonth(ymd)
  return ymd.slice(0, 4)
}
```

Now let's look at the core summarize function in summary-access.ts. The type definitions show the dimension-driven shape:

```bash
grep -n 'export type Summary' /home/chris/expense-log/src/lib/db/summary-access.ts && grep -n 'export interface SummarizeFilters' /home/chris/expense-log/src/lib/db/summary-access.ts && grep -n 'export interface SummarizeSort' /home/chris/expense-log/src/lib/db/summary-access.ts && grep -n 'export interface SummaryRow' /home/chris/expense-log/src/lib/db/summary-access.ts && grep -n 'export const summarize' /home/chris/expense-log/src/lib/db/summary-access.ts
```

```output
17:export type SummaryDimension = 'time' | 'category' | 'tag' | 'category-tag'
18:export type SummaryGranularity = 'month' | 'quarter' | 'year'
20:export interface SummarizeFilters {
26:export interface SummarizeSort {
38:export interface SummaryRow {
105:export const summarize = (
```

The summarize function accepts dimension, granularity, optional filters (from, to, tagIds), and optional sort override. It returns a Result of dimension-shaped rows:

```bash
sed -n '1,60p' /home/chris/expense-log/src/lib/db/summary-access.ts
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read helpers for expense summaries.
 * @module lib/db/summary-access
 */
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { Result } from 'true-myth'

import { category, expense, expenseTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'
import { monthKeyEt, quarterKeyEt, yearKeyEt } from '../et-date'

export type SummaryDimension = 'time' | 'category' | 'tag' | 'category-tag'
export type SummaryGranularity = 'month' | 'quarter' | 'year'

export interface SummarizeFilters {
  from?: string
  to?: string
  tagIds?: string[]
}

export interface SummarizeSort {
  column: string
  direction: 'asc' | 'desc'
}

export interface SummarizeInput {
  dimension: SummaryDimension
  granularity: SummaryGranularity
  filters: SummarizeFilters
  sort?: SummarizeSort[]
}

export interface SummaryRow {
  timePeriod: string
  categoryName?: string
  tagName?: string
  count: number
  totalCents: number
}

/** Return WHERE conditions for the date bounds in `filters`. */
const buildDateConditions = (filters: SummarizeFilters): ReturnType<typeof eq>[] => {
  const conditions: ReturnType<typeof eq>[] = []
  if (filters.from && filters.from.length > 0) {
    conditions.push(gte(expense.date, filters.from))
  }
  if (filters.to && filters.to.length > 0) {
    conditions.push(lte(expense.date, filters.to))
  }
  return conditions
}

/** Return the time-period key function for the given granularity. */
const pickTimePeriodFn = (granularity: SummaryGranularity): ((ymd: string) => string) =>
  granularity === 'year' ? yearKeyEt : granularity === 'quarter' ? quarterKeyEt : monthKeyEt
```

Key behaviors of summarize: tagIds use AND semantics (only expenses carrying ALL listed tags are included). Recurring templates participate only as materialized expense rows. Zero-tag expenses are included in time/category dimensions but excluded from tag/category-tag. Multi-tagged expenses double-count in tag/category-tag dimensions. The default sort is group columns ascending (case-insensitive) then timePeriod ascending.

Now let's examine the parseSummaryQuery validator in expense-validators.ts:

```bash
grep -n 'export const parseSummaryQuery' /home/chris/expense-log/src/lib/expense-validators.ts && grep -n 'VALID_DIMENSIONS' /home/chris/expense-log/src/lib/expense-validators.ts && grep -n 'VALID_GRANULARITIES' /home/chris/expense-log/src/lib/expense-validators.ts && grep -n 'SummaryQueryResult' /home/chris/expense-log/src/lib/expense-validators.ts
```

```output
974:export const parseSummaryQuery = (raw: RawSummaryQuery): SummaryQueryResult => {
921:const VALID_DIMENSIONS = ['time', 'category', 'tag', 'category-tag'] as const
922:export type SummaryDimension = (typeof VALID_DIMENSIONS)[number]
990:    if ((VALID_DIMENSIONS as readonly string[]).includes(v)) {
993:      fieldErrors.groupBy = `Dimension must be one of: ${VALID_DIMENSIONS.join(', ')}.`
924:const VALID_GRANULARITIES = ['month', 'quarter', 'year'] as const
925:export type SummaryGranularity = (typeof VALID_GRANULARITIES)[number]
1000:    if ((VALID_GRANULARITIES as readonly string[]).includes(v)) {
1005:        : `Granularity must be one of: ${VALID_GRANULARITIES.join(', ')}.`
952:export type SummaryQueryResult = {
974:export const parseSummaryQuery = (raw: RawSummaryQuery): SummaryQueryResult => {
```

The validator defines VALID_DIMENSIONS, VALID_GRANULARITIES, and VALID_SORT_COLUMNS constants. It parses dimension, granularity, date range, tagIds, and sort parameters, defaulting dimension to category and granularity to month. Unknown values report a groupBy field error and fall back to defaults.

The route implementation in build-summary.tsx (345 lines) handles GET /summary. It parses query params, calls summarize and listTags in parallel, and renders ControlsForm + ResultsTable. Key helpers include sortUrl for building query-string sort links and COLUMN_MAP for dimension-driven column headers.

Test coverage was added across three test files:

```bash
wc -l /home/chris/expense-log/tests/summary-access.spec.ts /home/chris/expense-log/tests/et-date.spec.ts /home/chris/expense-log/tests/expense-validators.spec.ts
```

```output
  550 /home/chris/expense-log/tests/summary-access.spec.ts
  187 /home/chris/expense-log/tests/et-date.spec.ts
 1047 /home/chris/expense-log/tests/expense-validators.spec.ts
 1784 total
```

Summary-access.spec.ts (551 lines) covers all four dimensions, three granularities, tag-AND filtering, recurring materialized rows, default sort, and explicit sort override.

Et-date.spec.ts (188 lines) covers DST boundaries, default ranges, isValidYmd, and the three key helpers.

Expense-validators.spec.ts (1048 lines) covers parseExpenseCreate, category/tag management, parseExpenseListFilters, parseRecurringCreate, and parseSummaryQuery (46 cases).
