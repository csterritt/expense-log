# Tasks for #17: Updated Summary page

Parent issue: `Notes/issues/17-updated-summary.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. Each feature is split into a **RED** step (write a failing test first), a **GREEN** step (write the minimal code to make the test pass), and a **REFACTOR** step (clean up once the test is green). Do not skip ahead — RED must fail for the right reason before GREEN begins, and REFACTOR must keep the suite green.

## Tasks

### 1. RED: failing tests for the `et-date` summary key helpers

**Type**: RED
**Output**: `tests/et-date.spec.ts` adds failing coverage for three not-yet-implemented helpers `monthKeyEt`, `quarterKeyEt`, and `yearKeyEt` operating on a `YYYY-MM-DD` ET-anchored string. Tests assert: every calendar month maps to its expected `Mmm` label (e.g. `Jan`); every month maps to the correct `Mmm-Mmm` quarter label (boundary cases on March 31 / April 1, June 30 / July 1, September 30 / October 1, December 31 / January 1); leap-day input (`2024-02-29`) maps to `Feb`, `Jan-Mar`, `2024`; year-boundary inputs map correctly; and invalid `YYYY-MM-DD` inputs are rejected via the same mechanism the module already uses. Run the suite and confirm the new tests fail (and existing tests still pass) before moving on.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the existing `tests/et-date.spec.ts` harness and table-driven assertion style. Do not introduce new test infrastructure; assert outputs, not implementation details.

---

### 2. GREEN: implement the `et-date` summary key helpers

**Type**: GREEN
**Output**: `src/lib/et-date.ts` exports three pure helpers operating on a `YYYY-MM-DD` ET-anchored string: `monthKeyEt(ymd)` returns the capitalized three-letter month abbreviation (e.g. `Jan`); `quarterKeyEt(ymd)` returns the calendar-quarter label `Mmm-Mmm` (one of `Jan-Mar`, `Apr-Jun`, `Jul-Sep`, `Oct-Dec`); `yearKeyEt(ymd)` returns the four-digit year (e.g. `2026`). All three reject inputs that fail `isValidYmd` consistently with the rest of the module. Write only the minimum needed to turn the task-1 tests green.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and the skills under `Notes/skills/code-writing`. Match the existing `et-date.ts` style: short module-level JSDoc, plain string slicing where possible, no `Date` round-tripping that could re-interpret the date in another zone, and `Intl`-free output. Reuse `isValidYmd` rather than introducing a second regex. Note that the dead, unwired file `src/lib/db/summary-access.ts` currently imports `monthKeyEt` and `yearKeyEt` from this module; do not preserve compatibility with that file — task 5 replaces it entirely.

---

### 3. REFACTOR: tidy the `et-date` helpers

**Type**: REFACTOR
**Output**: With the helper tests green, refactor `src/lib/et-date.ts` for clarity: extract any duplicated month-name lookup, ensure JSDoc is consistent with the surrounding module, and remove any scaffolding introduced during GREEN that is no longer earning its keep. Run `npm test` (or the equivalent focused command) and confirm the suite stays green.
**Depends on**: 2

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here — if a gap appears, return to a new RED step instead.

---

### 4. RED: failing tests for `summarize`

**Type**: RED
**Output**: `tests/summary-access.spec.ts` (new file, mirroring the structure of `tests/expense-access.spec.ts`) adds failing coverage for a not-yet-implemented `summarize(db, input)` repo function. The seeded dataset includes at least: expenses across at least three categories and at least three tags; one expense carrying ≥ 2 tags; one expense carrying zero tags; expenses spread across at least two months in two different quarters and across two years; and at least one materialized recurring-expense row alongside manual rows. Tests assert: each of the four dimensions (`time`, `category`, `tag`, `category-tag`) returns the expected column shape; each of the three granularities (`month`, `quarter`, `year`) returns the expected `timePeriod` label format; by-tag double-counting (same expense appears under each of its tags with full `count` and `totalCents`); zero-tag expenses are excluded from `Tag` and `Category + Tag` results; AND tag-filter narrowing of two and three tags; default sort and one explicit `sort` override; empty filter set returns `[]`; materialized recurring rows are counted exactly like manual rows. Run the suite and confirm the new tests fail before moving on.
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the existing database-test harness and seeding patterns from `tests/expense-access.spec.ts` and any helpers under `tests/` that already seed expenses, categories, tags, and recurring rows. Assert returned `categoryName` / `tagName` / `timePeriod` / `count` / `totalCents` fields; do not assert SQL shape.

---

### 5. GREEN: implement `summarize` (replacing `summary-access.ts`)

**Type**: GREEN
**Output**: `src/lib/db/summary-access.ts` exports a new `summarize(db, input)` returning `Promise<Result<SummaryRow[], Error>>`, where `input` is `{ dimension: 'time' | 'category' | 'tag' | 'category-tag'; granularity: 'month' | 'quarter' | 'year'; filters: { from?: string; to?: string; tagIds?: string[] }; sort?: { column: string; direction: 'asc' | 'desc' }[] }`. A `SummaryRow` carries the optional fields the dimension dictates (`categoryName?`, `tagName?`), the always-present `timePeriod` key (formatted via the helpers from task 2), `count`, and `totalCents`. Behavior: filters narrow the underlying expense set first (date bounds compared as `YYYY-MM-DD` strings; `tagIds` of length ≥ 2 means AND — every selected tag must appear; empty means no tag filter); aggregation groups by the dimension's group columns plus the time-period key; when the dimension includes `Tag`, an expense with N tags contributes one row per tag for both `count` and `totalCents` (intentional double-count); expenses with no tags are excluded from `Tag` and `Category + Tag` aggregations; default sort is group columns ascending (case-insensitive alphabetical for category/tag) then time-period ascending; `sort` overrides the default and is applied stably; an empty result returns `[]`. **No grand total and no percent-of-total field.** Recurring expenses participate only as already-materialized `expense` rows; nothing in this function anticipates future occurrences. Write only the minimum needed to turn the task-4 tests green.
**Depends on**: 4

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and the skills under `Notes/skills/code-writing` and `Notes/skills/code-writing/database-access`. The current contents of `src/lib/db/summary-access.ts` are dead, unreferenced, and should be replaced wholesale (do not preserve its `SummaryRow` shape, its `SummarizeFilters` interface, its OR/AND tag mode, or any of its grouping semantics — they are all superseded by the new PRD design). Match the existing `expense-access.ts` style: exported function wrapped in `withRetry`, a private `Actual` helper, `Result` return values, Drizzle queries, HTTP-agnostic error messages. Reuse the existing filter-where-clause idioms from `listExpenses` for date bounds. The tag-AND filter should be implemented in SQL (subquery / `HAVING COUNT(DISTINCT tagId) = N`) so it composes cleanly with the aggregation. The aggregation itself may be done in SQL with `GROUP BY` over the relevant columns; computing the time-period key in TypeScript after fetching narrow per-row data is also acceptable as long as it remains fast for realistic dataset sizes.

---

### 6. REFACTOR: tidy `summarize`

**Type**: REFACTOR
**Output**: With the `summarize` tests green, refactor `src/lib/db/summary-access.ts` for clarity: extract the tag-AND subquery, the date-bound where clause, and the time-period projection into named helpers if they improve readability; collapse any duplication with `expense-access.ts` filter idioms; tighten types on `SummaryRow` so optional fields are present iff the dimension implies them. Run the full unit-test suite and confirm it stays green.
**Depends on**: 5

Read and follow `Notes/skills/code-writing/always-do-red-green.md` and `Notes/skills/code-writing/database-access`. Refactors must not change observable behavior; do not add new test cases here — if a gap appears, return to a new RED step instead.

---

### 7. RED: failing tests for `parseSummaryQuery`

**Type**: RED
**Output**: `tests/expense-validators.spec.ts` adds failing coverage for a not-yet-implemented `parseSummaryQuery(raw)` validator. Tests assert: empty input reports `hasFilterParams: false` and yields the documented defaults (`dimension: 'category'`, `granularity: 'month'`, `tagIds: []`, `sort: []`); unknown `dimension`, `granularity`, sort `column`, or sort `direction` values are rejected with field errors; valid open-from / open-to / both-set / both-absent ranges parse correctly; `from > to` is rejected with the same error key as `parseExpenseListFilters`; multiple `tagId` values accumulate into the array; multiple `sort` values accumulate in order; presence of any of these keys flips `hasFilterParams` to `true`. Run the suite and confirm the new tests fail before moving on.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the existing validator test structure in `tests/expense-validators.spec.ts`; do not introduce a new test harness. Assert normalized outputs, not implementation details.

---

### 8. GREEN: implement `parseSummaryQuery`

**Type**: GREEN
**Output**: `src/lib/expense-validators.ts` exports `parseSummaryQuery(raw)` parsing the summary page's query string into `{ dimension: 'time' | 'category' | 'tag' | 'category-tag'; granularity: 'month' | 'quarter' | 'year'; from?: string; to?: string; tagIds: string[]; sort: { column: string; direction: 'asc' | 'desc' }[]; hasFilterParams: boolean; fieldErrors: FieldErrors }`. `dimension` defaults to `'category'` when absent and rejects unknown values; `granularity` defaults to `'month'` and rejects unknown values; `from` and `to` reuse the existing `YYYY-MM-DD` validation and the same `from <= to` check used by `parseExpenseListFilters`; `tagIds` is parsed from repeated `tagId` query params (zero or more); `sort` parses repeated `sort` params of the form `column:direction` (e.g. `category:asc`, `total:desc`) and rejects unknown columns or directions with field errors; `hasFilterParams` is `true` whenever any of these keys was present in the raw input. Write only the minimum needed to turn the task-7 tests green.
**Depends on**: 7

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the existing `parseExpenseListFilters` pattern: HTTP-agnostic input (plain object or `URLSearchParams`-like), `FieldErrors`-shaped output for inline rendering, reuse `isValidYmd`, and mirror the `from <= to` check already present for the list filter. Keep the function pure.

---

### 9. REFACTOR: tidy `parseSummaryQuery`

**Type**: REFACTOR
**Output**: With the validator tests green, refactor `src/lib/expense-validators.ts` to share helper logic between `parseExpenseListFilters` and `parseSummaryQuery` where it makes sense (date-range checking, repeated-param accumulation), without changing either function's observable contract. Run the validator suite and confirm it stays green.
**Depends on**: 8

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Do not weaken existing assertions and do not introduce new behavior here — if a gap appears, return to a new RED step instead.

---

### 10. RED: failing Playwright e2e for the new `/summary` page (defaults, dimensions, granularities, sort, clear, empty)

**Type**: RED
**Output**: A new spec under `e2e-tests/summary/` (e.g. `01-summary-defaults-and-controls.spec.ts`) signs in, seeds expenses across multiple categories, tags, and months/quarters/years with known totals (including at least one expense with ≥ 2 tags and one with zero tags), and asserts: (a) on first visit to `/summary` (no query string) the dimension is `Category`, the granularity is `Month`, no tag filter is applied, the date range matches the list default, the table is sorted by group columns ascending then time-period ascending, there is no grand-total row, and there is no percent column; (b) switching the dimension through `Time only`, `Tag`, `Category + Tag` adds/drops the expected columns; (c) switching the granularity to `Quarter` and `Year` re-renders the time-period column with `Mmm-Mmm` and `YYYY` labels respectively; (d) clicking each column header toggles the sort indicator and re-orders rows; (e) the by-tag inline note appears for `Tag` and `Category + Tag` and is absent otherwise; (f) `Clear` returns the controls to first-load defaults; (g) a date range that yields no rows replaces the table with the empty-state message. Run the spec and confirm it fails (because the route still renders the placeholder) before moving on.
**Depends on**: 6, 9

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Use the sign-in and database helpers from `e2e-tests/support/`. Follow the structure of the existing expense list/filter and earlier summary-related specs. Assert via the `summary-*` testids that the GREEN step (task 12) will introduce. Run with `npx playwright test -x` while developing.

---

### 11. RED: failing Playwright e2e for tag-AND filter + recurring participation

**Type**: RED
**Output**: A second spec under `e2e-tests/summary/` (e.g. `02-summary-tag-filter-and-recurring.spec.ts`) asserts: (a) selecting a single tag in the tag filter narrows the aggregation to expenses carrying that tag (and the column shape still depends only on the dimension, not on the filter); (b) selecting two tags applies AND semantics (only expenses carrying both contribute); (c) a recurring template whose next occurrence is in the future (using `/test/set-clock` to control "today") does **not** contribute any row to the summary; (d) advancing the clock past the anchor and invoking `/test/run-cron` materializes the occurrence, after which the materialized row appears in the summary just like a manual expense. Run the spec and confirm it fails before moving on.
**Depends on**: 6, 9

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Reuse the seeding and selector helpers from the previous summary spec rather than duplicating them. Use the `/test/set-clock` and `/test/run-cron` dev-only routes from Issue 14 to drive the recurring-participation case deterministically.

---

### 12. GREEN: render the new `/summary` page

**Type**: GREEN
**Output**: `src/routes/build-summary.tsx` replaces the current placeholder ("Summary coming soon") with a full implementation. The handler parses the query string with `parseSummaryQuery`, applies `defaultRangeEt()` only when `hasFilterParams` is `false` (first-load default window), calls `summarize` with the parsed `dimension`, `granularity`, `filters`, and `sort`, and renders a page containing — above the table — a `<select>` for the group-by dimension (`Time only` / `Category` / `Tag` / `Category + Tag`), a `<select>` for the time-period granularity (`Month` (default) / `Quarter` / `Year`) that is **always visible**, a tag picker that submits zero or more `tagId` query params (server-rendered `<select multiple>` is acceptable; if a chip-style enhancement is added later it is out of scope here), `from` and `to` `type="date"` inputs, a Submit button, and a `Clear` link to `/summary` that resets all controls and the date range to defaults. The form uses a `GET` submission so state lives in the URL. Selected/typed values are preserved across submissions via `value` / `selected`. Below the controls, the page renders a results table whose columns are derived from the dimension (`category` iff dimension includes Category, `tag` iff dimension includes Tag, the time-period column always, plus `count` and `total`); totals are formatted via `formatCents`. **No grand-total row and no percent-of-total column.** Every column header is a clickable link that toggles ascending/descending sort by that column via the `sort` query param, with a visible indicator of the current direction. When the dimension includes `Tag`, an inline note reads "Multi-tagged expenses count fully under each tag; row totals therefore stand alone and do not sum to a meaningful grand total." When the filtered set is empty, the table is replaced by an empty-state message. Field-level errors render inline under the relevant control. Write only the minimum needed to turn both task-10 and task-11 specs green.
**Depends on**: 10, 11

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and the skills under `Notes/skills/code-writing` and `Notes/skills/code-writing/styling-html-and-tsx`. Follow the existing route, layout, secure-header, `signedInAccess`, and `createDbClient` patterns in `build-expenses.tsx` and the current `build-summary.tsx` placeholder. Use real HTML form controls so the page works without JavaScript. Use `value`/`selected` (not `defaultValue`/`defaultChecked`). Add stable `data-testid` attributes following the project convention: `summary-dimension`, `summary-granularity`, `summary-tag-filter`, `summary-from`, `summary-to`, `summary-submit`, `summary-clear`, `summary-row`, `summary-empty`, `summary-tag-note`, and `summary-sort-{column}` for each header link. Reuse `formatCents` from `src/lib/money.ts`. Do not change existing layout or navigation.

---

### 13. REFACTOR: tidy the `/summary` route

**Type**: REFACTOR
**Output**: With both Playwright specs green, refactor `src/routes/build-summary.tsx` for clarity: extract the controls form, the results table, and the sort-link helper into small JSX components or local helpers; collapse any duplicated query-string serialization between the form's hidden state and the sort links; ensure the file matches the style of the surrounding routes. Re-run the unit suite and the new Playwright specs and confirm everything stays green.
**Depends on**: 12

Read and follow `Notes/skills/code-writing/always-do-red-green.md` and `Notes/skills/code-writing/styling-html-and-tsx`. Refactors must not change observable behavior or testids; do not add new behavior here — if a gap appears, return to a new RED step instead.

---

### 14. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` document the Issue 17 redesign of the summary page: the four dimensions, the always-present three-granularity selector, the tag-AND filter, the dimension-driven column shape, the absence of grand totals and percent-of-total, the `Mmm` / `Mmm-Mmm` / `YYYY` label formats, the sortable headers, the new `summarize` signature, the new `parseSummaryQuery` validator, the new `quarterKeyEt` helper (and the redefinition of `monthKeyEt` / `yearKeyEt` to return `Mmm` / `YYYY`), and the rule that recurring expenses participate only as materialized rows. Update `Notes/wiki/index.md` and append one `## [YYYY-MM-DD] ingest | Issue 17: Updated Summary page` entry to `Notes/wiki/log.md`.
**Depends on**: 13

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link the existing `expense-access`, `expense-validators`, `et-date`, recurring-cron, and route wiki pages where the behavior is extended or replaced. Note explicitly that the previous summary semantics (three-option grouping, percent-of-total, total-desc default sort) are superseded.

---

### 15. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A new walkthrough directory at `Notes/walkthroughs/17-updated-summary/code-walkthrough/` containing showboat-generated files that explain the implementation across `et-date` (the three key helpers), `summary-access` (the new `summarize`), `expense-validators` (`parseSummaryQuery`), and `build-summary` (the route).
**Depends on**: 14

Run `uvx showboat --help` first to confirm current flags, then generate the walkthrough into the specified directory. Include the helper, repository, validator, route, and test files touched by Issue 17.

---

### 16. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A new walkthrough directory at `Notes/walkthroughs/17-updated-summary/ui-walkthrough/` containing showboat-generated files that demonstrate the user-facing flows added by Issue 17: the default `Category` / `Month` view, switching dimensions through `Time only`, `Tag`, and `Category + Tag` (with the inline note for tag dimensions), switching granularities through `Quarter` and `Year`, applying a tag-AND filter, toggling sort by clicking column headers, the `Clear` reset, the empty-state view, and the recurring-after-materialization participation flow.
**Depends on**: 15

Run `uvx showboat --help` first to confirm current flags, then generate the walkthrough into the specified directory. Cover the user-visible paths exercised by tasks 10 and 11.

---

### 17. Final human review

**Type**: REVIEW
**Output**: A human has reviewed the completed Issue 17 implementation, confirmed every checkbox in the issue's _Acceptance criteria_ section, and worked through the manual checklist in the issue's _How to verify_ section. Particular attention paid to: dimension-driven column shape (no Category column on `Time only`; no Tag column on `Category`; etc.), the absence of any grand-total row and any percent column, the exact label formats (`Mmm`, `Mmm-Mmm`, `YYYY`), case-insensitive alphabetical default sort behavior, the tag-AND narrowing semantics, sort toggling on every column, the `Clear` reset returning to first-load defaults, the empty-state behavior, and the recurring-participation rule (future occurrences excluded; materialized occurrences included).
**Depends on**: 16

Review the final diff, run the focused and full relevant test suites (`npm test`, the new Playwright specs, and the existing `e2e-tests/expenses/` and recurring specs to ensure no regression), and manually verify `/summary` against the issue's checklist.

---
