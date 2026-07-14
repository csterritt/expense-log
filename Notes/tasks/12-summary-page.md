# Tasks for #12: Summary page

Parent issue: `Notes/issues/12-summary-page.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add `monthKeyEt` and `yearKeyEt` to `et-date`

**Type**: WRITE
**Output**: `src/lib/et-date.ts` exports two pure helpers, `monthKeyEt(ymd: string): string` returning the `YYYY-MM` prefix of a `YYYY-MM-DD` input and `yearKeyEt(ymd: string): string` returning the `YYYY` prefix. Both helpers reject inputs that fail `isValidYmd` by throwing or returning a clearly documented sentinel consistent with the rest of the module. The helpers operate purely on the already-ET-anchored `YYYY-MM-DD` string and do not re-interpret it through `Date` arithmetic.

**Depends on**: none

Read and follow the skills under `Notes/skills/code-writing`. Match the existing `et-date.ts` style: short module-level JSDoc, `Intl`-free string slicing where possible, and HTTP/DB-agnostic pure functions. Reuse `isValidYmd` for input guarding rather than introducing a second regex. Keep the public surface minimal and add module-level JSDoc explaining that the keys are designed for stable lexicographic sorting in `summarize` Date grouping.

---

### 2. Unit test `monthKeyEt` and `yearKeyEt`

**Type**: TEST
**Output**: `tests/et-date.spec.ts` covers `monthKeyEt` and `yearKeyEt` for: typical mid-month dates, the first and last day of a month, the first and last day of a year, dates straddling the spring-forward and fall-back DST transitions in `America/New_York`, and invalid `YYYY-MM-DD` inputs (which must be rejected via the documented mechanism).

**Depends on**: 1

Read and follow the skills under `Notes/skills/code-writing`. Reuse the existing `tests/et-date.spec.ts` harness and table-driven assertion style. Do not introduce new test infrastructure; assert outputs not implementation details.

---

### 3. Implement `expense-repo.summarize`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `summarize(db, grouping, granularity, filters)` returning `Result<SummaryRow[], Error>` where `grouping` is `'category' | 'tag' | 'date'`, `granularity` is `'month' | 'year'` (only used when `grouping === 'date'`), and `filters` reuses the existing `ListExpenseFilters` shape (description, from, to, categoryId, tagIds, tagMode) but is typically called by the summary route with only `from`/`to` populated. A `SummaryRow` is `{ key: string; label: string; count: number; totalCents: number; percentOfTotal: number }`. The function applies the same filter semantics as `listExpenses`. For Category grouping, rows are one per category, label is the category name (lowercase), count and total are over expenses in that category, percent is `totalCents / overallTotalCents`. For Tag grouping, an expense with N tags contributes its full `amountCents` and a count of 1 to each of its N tag rows; expenses with no tags are excluded from tag grouping; percent is computed relative to the **sum of tagged-row totals** (which can exceed 100% when divided by the overall expense total, but here is by construction normalised to the tagged-row sum). For Date grouping, the row key is `monthKeyEt(expense.date)` when `granularity === 'month'` and `yearKeyEt(expense.date)` when `granularity === 'year'`; label equals the key. Rows are sorted by `totalCents` descending with a stable secondary key (label ascending). Returns an empty array when no expenses match the filters.

**Depends on**: 1

Read and follow the skills under `Notes/skills/code-writing` and `Notes/skills/code-writing/database-access`. Match the existing `expense-access` style: exported function wrapped in `withRetry`, a private `Actual` helper, `Result` return values, Drizzle queries, and HTTP-agnostic error messages. Reuse the existing filter-where-clause construction from `listExpenses` (or extract a shared helper if doing so is straightforward) so the filter semantics — including tag AND/OR mode, case-insensitive description `LIKE`, `YYYY-MM-DD` string-comparison date bounds, and category equality — stay identical to the list view. Aggregation may be done in SQL where natural; for the by-tag double-counting case, joining to `expenseTag` and grouping by `tagId` is the expected approach. Do not change the public shape of `ExpenseRow` or any other existing repo type.

---

### 4. Unit test `summarize` arithmetic

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `summarize` against a seeded dataset: Category grouping returns one row per category with correct count, total, and percent (rows sum to 100% within a small epsilon over the overall total); Tag grouping double-counts an expense tagged with two tags (full amount appearing under each tag, count of 1 under each), excludes untagged expenses, and computes percent relative to the sum of tagged-row totals; Date grouping with Month granularity buckets across multiple months and with Year granularity collapses those same rows into year buckets; the `from`/`to` filters narrow the underlying expense set before aggregation; an empty filtered set returns `[]`; default sort is total descending with stable secondary order.

**Depends on**: 3

Read and follow the skills under `Notes/skills/code-writing`. Reuse the existing `tests/expense-access.spec.ts` database harness and seeding patterns. Seed at least one expense tagged with two tags so the by-tag case is meaningfully different from the by-category case. Assert returned `key`/`label`/`count`/`totalCents` fields and `percentOfTotal` within a small epsilon; do not assert SQL shape.

---

### 5. Add summary-query parsing validator

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` exports `parseSummaryQuery(raw)` that parses the summary page's query string into `{ grouping: 'category' | 'tag' | 'date'; granularity: 'month' | 'year'; from?: string; to?: string; hasFilterParams: boolean; fieldErrors: FieldErrors }`. `grouping` defaults to `'category'` when absent and rejects unknown values; `granularity` defaults to `'month'` and is only meaningful when `grouping === 'date'` (it is still parsed and returned for the route to echo back into form state); `from` and `to` reuse the same `YYYY-MM-DD` validation as the list-filter parser; `hasFilterParams` is `true` when any of `grouping`, `granularity`, `from`, or `to` was present in the raw input.

**Depends on**: none

Read and follow the skills under `Notes/skills/code-writing`. Follow the existing `parseExpenseListFilters` pattern and reuse `isValidYmd` rather than introducing a second date check. Keep the helper HTTP-agnostic so it accepts a plain object/Map of query values. Field-level errors must be compatible with the existing `FieldErrors` shape so the summary page can re-render with friendly messages under the relevant control.

---

### 6. Test the summary-query parser

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` covers `parseSummaryQuery`: empty input reports `hasFilterParams: false` and yields the documented defaults (`grouping: 'category'`, `granularity: 'month'`); unknown `grouping` or `granularity` values are rejected with field errors; valid open-from / open-to / both-set / both-absent ranges parse correctly; invalid `from`/`to` produce field errors; presence of any of the four keys flips `hasFilterParams` to `true`.

**Depends on**: 5

Read and follow the skills under `Notes/skills/code-writing`. Reuse the existing validator test structure in `tests/expense-validators.spec.ts`; do not introduce a new test harness. Assert normalized outputs, not implementation details.

---

### 7. Render the summary page

**Type**: WRITE
**Output**: `src/routes/build-summary.tsx` replaces the current placeholder with a full implementation: it parses the query string with `parseSummaryQuery`, applies `defaultRangeEt()` only when `hasFilterParams` is `false` (first-load behavior), calls `summarize` with the parsed grouping, granularity, and date range, and renders a page containing — above the table — a single grouping selector with `Category` / `Tag` / `Date` options, a granularity selector (Month / Year, default Month) shown only when grouping is Date, `from` and `to` date inputs, a Submit button, and a "Clear filters" link to `/summary`. The form uses a `GET` submission so state lives in the URL. Selected/typed values are preserved across submissions via `value`/`selected`/`checked`. When grouping is Tag, an in-UI note reads "Multi-tagged expenses count fully under each tag; percentages may sum to > 100%." Below the controls, the page renders a results table with columns Group, Count, Total (formatted via `formatCents`), and Percent of total (formatted as a percent with one decimal, e.g. `42.3%`), sorted by total descending. When the filtered set is empty, the table is replaced with an empty-state message. Field-level errors render inline under the relevant control.

**Depends on**: 3, 5

Read and follow the skills under `Notes/skills/code-writing` and the project's HTML/TSX styling skill (`Notes/skills/code-writing/styling-html-and-tsx`). Follow the existing route, layout, secure-header, `signedInAccess`, `createDbClient`, and form-state patterns in `build-expenses.tsx` and the current `build-summary.tsx`. Use real HTML form controls so the page works without JavaScript: a `<select>` for grouping, a `<select>` (or radio group) for granularity, and `type="date"` inputs for the range. Use `value`/`selected`/`checked` (not `defaultValue`/`defaultChecked`). Add stable `data-testid` attributes following the project convention (`summary-grouping`, `summary-granularity`, `summary-from`, `summary-to`, `summary-submit`, `summary-clear`, `summary-row`, `summary-empty`, `summary-tag-note`). Reuse `formatCents` from `src/lib/money.ts`. Do not change existing layout or navigation.

---

### 8. Playwright e2e: default first-load and grouping switches

**Type**: TEST
**Output**: A new spec under `e2e-tests/` (e.g. `e2e-tests/summary/`) signs in, seeds expenses across multiple categories, tags, and months with known totals, and verifies: (a) on first visit to `/summary` (no query string) the grouping selector is set to Category, the granularity selector is hidden, the date range is the same default as the list, and the table is sorted by total descending; (b) switching the grouping to Tag re-renders the table grouped by tag with multi-tagged expenses counted under each tag and the in-UI note visible; (c) switching the grouping to Date reveals the granularity selector defaulting to Month, and switching granularity to Year collapses the rows correctly.

**Depends on**: 7

Read and follow the skills under `Notes/skills/code-writing`. Use the sign-in and database helpers from `e2e-tests/support/`. Follow the structure of the existing expense list/filter specs. Assert via the `summary-row`, `summary-grouping`, `summary-granularity`, and `summary-tag-note` testids from the implementation. Run with `npx playwright test -x` while developing.

---

### 9. Playwright e2e: date-range filter and empty state

**Type**: TEST
**Output**: A new spec under `e2e-tests/summary/` verifies: (a) applying a `from`/`to` range that includes only a subset of the seeded expenses re-renders the table with that subset and updated totals/percents; (b) Clear filters returns the page to the same default first-load state; (c) applying a range that yields no matching expenses replaces the table with the empty-state message identified by the `summary-empty` testid.

**Depends on**: 7

Read and follow the skills under `Notes/skills/code-writing`. Reuse the seeding and selector helpers from the previous summary spec rather than duplicating them. Keep this spec focused on the date-range and empty-state behaviors.

---

### 10. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` document the Issue 12 summary page: the grouping/granularity/date-range controls, the `summarize` repo function (including the by-tag double-counting rule and the percent-of-tagged-total normalisation), the new `monthKeyEt` / `yearKeyEt` helpers, the `parseSummaryQuery` validator, the default-window-on-first-load behavior, and the new e2e coverage. `Notes/wiki/index.md` and `Notes/wiki/log.md` are updated according to the wiki rules.

**Depends on**: 8, 9

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link the existing `expense-access`, `expense-validators`, `et-date`, and route wiki pages where the behavior is extended. Append a single dated ingest entry for Issue 12.

---

### 11. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/12-summary-page/code-walkthrough` containing showboat-generated files that explain the summary implementation across `et-date`, `expense-access` (`summarize`), `expense-validators` (`parseSummaryQuery`), and `build-summary`.

**Depends on**: 10

Use showboat to create a code walkthrough of the implementation. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Include the helper, repository, validator, route, and test files touched by Issue 12.

---

### 12. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/12-summary-page/ui-walkthrough` containing showboat-generated files that demonstrate the user-facing flows added by Issue 12: the default Category view, switching to Tag (with the in-UI note), switching to Date with Month and then Year granularity, applying a date-range filter, Clear filters, and the empty-state view.

**Depends on**: 11

Use showboat to create a UI walkthrough of `/summary`. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Cover all user-visible paths exercised by the e2e specs.

---

### 13. Human review

**Type**: REVIEW
**Output**: A human has reviewed the completed Issue 12 implementation, verified the manual checklist from `Notes/issues/12-summary-page.md`, and confirmed the summary semantics (default Category grouping, total-desc sort, by-tag double counting with the in-UI note, Date grouping with Month/Year granularity, default-window-on-first-load, Clear filters, empty state) are acceptable before proceeding to the next issue.

**Depends on**: 12

Review the final diff, run the focused and full relevant test suites, and manually verify `/summary` using the issue's checklist. Pay particular attention to the tag double-counting math (percent normalised to the sum of tagged-row totals), to the DST-boundary behavior of `monthKeyEt` / `yearKeyEt`, and to the difference between "no filter params present" (default window applies) and "explicitly empty filter params" (no date bounds).

---
