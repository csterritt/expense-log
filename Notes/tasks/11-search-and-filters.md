# Tasks for #11: Search and filters on the expense list

Parent issue: `Notes/issues/11-search-and-filters.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Extend `ListExpenseFilters` and `listExpenses` to accept all filter parameters

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports an extended `ListExpenseFilters` shape supporting an optional case-insensitive description substring, optional `from`/`to` `YYYY-MM-DD` bounds (each independently optional), an optional `categoryId`, an optional `tagIds` list, and a `tagMode` of `'or'` or `'and'`. `listExpenses` applies all of them combined with AND across fields, uses case-insensitive `LIKE` for description, `YYYY-MM-DD` string comparison for date bounds when provided, category-id equality when provided, an `IN`-style filter for tag OR, and a subquery / group-by-with-having approach for tag AND that requires a matching expense to reference every selected tag. Result rows and ordering remain unchanged from the current behavior.

**Depends on**: none

Read and follow the skills under `Notes/skills/code-writing`. Match the existing `expense-access` style: exported function wrapped in `withRetry`, a private `Actual` helper, `Result` return values, Drizzle queries, and HTTP-agnostic error messages. Keep the existing `tagsByExpenseId` post-aggregation step intact for output assembly, but ensure the tag AND/OR filtering happens against `expenseTag` in the SQL `where`/subquery rather than in JavaScript. Preserve the current default sort (`date DESC`, then case-insensitive `description ASC`). Treat empty/whitespace-only description, empty `tagIds`, missing `from`, and missing `to` as "filter not applied" rather than errors. Do not change the public shape of `ExpenseRow`.

---

### 2. Unit test the extended `listExpenses`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers the extended filter behavior: description substring is case-insensitive and matches anywhere in the field; open-from, open-to, and both-absent date ranges return the expected rows; `categoryId` filter restricts to that category only; `tagMode: 'or'` returns expenses with any of the listed tags; `tagMode: 'and'` returns only expenses with all listed tags; combined filters AND across fields with tag-internal semantics governed by `tagMode`; result ordering and tag-name aggregation are unchanged from the pre-filter behavior.

**Depends on**: 1

Read and follow the skills under `Notes/skills/code-writing`. Reuse the existing `tests/expense-access.spec.ts` database harness and seeding patterns. Seed at least one expense that has both of two test tags so the AND case is meaningfully different from the OR case. Assert returned `id` sets and ordering, not implementation details.

---

### 3. Add list-filter query parsing validator

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` exports a helper that parses the expense-list filter query string into a normalized object usable by `listExpenses`: trimmed description (empty becomes "filter not applied"), `from`/`to` validated as `YYYY-MM-DD` (each independently optional), optional `categoryId` string, repeated `tagId` parameters collapsed into a deduplicated array, and a `tagMode` parsed from a checkbox/select that defaults to `or` and accepts only `or` or `and`. The helper also returns a flag indicating whether the request supplied any filter query parameters at all so the route layer can apply the default date window on first load.

**Depends on**: none

Read and follow the skills under `Notes/skills/code-writing`. Follow the existing `parseExpenseCreate`, `parseNewCategoryName`, and `parseTagCsv` patterns; keep the helper HTTP-agnostic so it accepts a plain object/Map of query values. Reuse the project's existing `YYYY-MM-DD` shape check used by the expense create/edit validators rather than introducing a second date format check. Field-level errors must be compatible with the existing form-state flow so the filter bar can re-render with friendly messages.

---

### 4. Test the list-filter query parser

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` covers the list-filter parser: empty input reports "no filter params present"; description is trimmed; bad `from` or `to` produces a field error; valid open-from / open-to / both-set / both-absent ranges parse correctly; multiple `tagId` values are collected and deduplicated; `tagMode` defaults to `or` and rejects unknown values; an unknown `categoryId` shape (non-string) is rejected.

**Depends on**: 3

Read and follow the skills under `Notes/skills/code-writing`. Reuse the existing validator test structure in `tests/expense-validators.spec.ts`; do not introduce a new test harness. Assert normalized outputs, not implementation details.

---

### 5. Render the filter bar above the expense list

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` renders a filter bar above the existing expenses table containing: a description text input, `from` and `to` date inputs, a category `<select>` populated from `listCategories` with a "(any)" option, a tag multi-select control populated from `listTags` with stable `data-testid` attributes per tag, an AND/OR toggle for tag-internal semantics, a Submit button, and a "Clear filters" control that links to `/expenses` with no query string. The form uses a `GET` submission so filter state lives in the URL. Selected/typed values are preserved across submissions via `value`/`selected`/`checked` attributes derived from the parsed query. Field-level errors from the parser render inline under the relevant input.

**Depends on**: 3

Read and follow the skills under `Notes/skills/code-writing` and the project's HTML/TSX styling skill. Follow the existing route, layout, secure-header, `signedInAccess`, `createDbClient`, and form-state patterns in `build-expenses.tsx`, `build-categories.tsx`, and `build-tags.tsx`. Use real HTML form controls so the page works without JavaScript; the tag multi-select must be functional as a plain `<select multiple>` or grouped checkbox control before any progressive enhancement. Use `value`/`selected`/`checked` (not `defaultValue`/`defaultChecked`). Keep the table and empty-state markup unchanged.

---

### 6. Wire `GET /expenses` to apply filters and the default window

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` parses the query string with the new filter parser, applies the default date window from `defaultRangeEt()` only when no filter query parameters are present (first-load behavior), passes the resulting filters to `listExpenses`, and renders the filter bar in its current state. "Clear filters" returns the page to the same default state as a fresh first load.

**Depends on**: 1, 5

Read and follow the skills under `Notes/skills/code-writing`. Reuse `defaultRangeEt`, `todayEt`, `redirectWithError`, and the existing `listCategories` / `listTags` calls already wired into the route. Do not change the create-expense POST handlers in this task; this is a pure read-side change. When the parser reports field errors, render the filter bar with the user's submitted values plus errors and an empty result list rather than calling `listExpenses` with invalid input.

---

### 7. Playwright e2e: description search and date-range edges

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` signs in, seeds a varied dataset spanning multiple months, and verifies: (a) submitting a description substring filters the list case-insensitively; (b) open-from (only `to` set), open-to (only `from` set), both-set, and both-absent (forces beyond the default window via explicit empty values) each filter correctly; (c) Clear filters restores the default window and clears the description.

**Depends on**: 6

Read and follow the skills under `Notes/skills/code-writing`. Use the sign-in and database helpers from `e2e-tests/support/`. Follow the structure of the existing expense list spec. Assert via the `expense-row` testids already used by the table. Run with `npx playwright test -x` while developing.

---

### 8. Playwright e2e: category and tag AND/OR filters

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` covers the category select (zero or one) and the tag multi-select with the AND/OR toggle: with two test tags `alpha` and `beta` and expenses variously tagged with neither, only alpha, only beta, and both, tag OR returns alpha-only ∪ beta-only ∪ both, while tag AND returns only the both-tagged expense. Selecting a category restricts results to that category. Combining category, tags, and AND/OR behaves as the AND-across-fields semantics with tag-internal mode honored.

**Depends on**: 6

Read and follow the skills under `Notes/skills/code-writing`. Seed the dataset through the existing support helpers. Use stable `data-testid` selectors from the filter bar implementation. Keep this spec focused on category and tag semantics; do not duplicate description/date coverage from task 7.

---

### 9. Playwright e2e: combined filters and Clear filters

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` exercises a combined-filters scenario (description + date range + category + tag AND with two tags) and verifies the result set is exactly the AND combination across fields with tag-internal AND. It then clicks "Clear filters" and verifies the page reloads to the default first-load state (default date window from `defaultRangeEt()`, no description, no category, no tags, AND/OR returned to its default).

**Depends on**: 6

Read and follow the skills under `Notes/skills/code-writing`. Use the support helpers and selectors from tasks 7 and 8 rather than duplicating their seeding. Keep assertions on visible row sets and on the form control state after Clear filters.

---

### 10. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` document the Issue 11 filter bar, the extended `listExpenses` filter shape (including tag AND vs OR semantics and the SQL approach used for each), the list-filter query parser, the default-window-on-first-load behavior, the Clear filters control, and the new e2e coverage. `Notes/wiki/index.md` and `Notes/wiki/log.md` are updated according to the wiki rules.

**Depends on**: 7, 8, 9

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link the existing `expense-access`, `expense-validators`, and `build-expenses` wiki pages where the behavior is extended, and explicitly call out the AND-across-fields vs tag-internal AND/OR distinction. Append a single dated ingest entry for Issue 11.

---

### 11. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/11-search-and-filters/code-walkthrough` containing showboat-generated files that explain the filter implementation across schema-free changes (`expense-access`, `expense-validators`, `build-expenses`).

**Depends on**: 10

Use showboat to create a code walkthrough of the implementation. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Include the repository, validator, route, and test files touched by Issue 11.

---

### 12. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/11-search-and-filters/ui-walkthrough` containing showboat-generated files that demonstrate the user-facing flows added by Issue 11: description search, each date-range edge, category filter, tag OR, tag AND, combined filters, and Clear filters.

**Depends on**: 11

Use showboat to create a UI walkthrough of `/expenses` with the new filter bar. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Cover all user-visible paths exercised by the e2e specs.

---

### 13. Human review

**Type**: REVIEW
**Output**: A human has reviewed the completed Issue 11 implementation, verified the manual checklist from `Notes/issues/11-search-and-filters.md`, and confirmed the filter semantics (AND across fields, tag-internal AND/OR, first-load default window, Clear filters) are acceptable before proceeding to the next issue.

**Depends on**: 12

Review the final diff, run the focused and full relevant test suites, and manually verify `/expenses` using the issue's checklist. Pay particular attention to the tag AND SQL path (no false positives from duplicated `expenseTag` rows), to open-ended date-range edges, and to the difference between "no filter params present" (default window applies) and "explicitly empty filter params" (no date bounds).

---
