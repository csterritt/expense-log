## Issue 17: Updated Summary page (new dimensions, granularities, sort, recurring rule)

**Type**: AFK
**Blocked by**: Issue 12

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Build the `/summary` page from scratch to match the rewritten PRD section _Summaries_. The previously-implemented summary code has been removed; this issue delivers the new design as a fresh vertical slice.

Concretely:

- Build a **group-by dimension** selector with four mutually-exclusive options: `Time only`, `Category`, `Tag`, `Category + Tag`. Default: `Category`.
- Build a **time-period granularity** selector (`Month` (default) | `Quarter` | `Year`) that is **always present** (the time-period column is always part of the result).
- Build a **tag filter** in the summary controls: zero or more tags. Empty = include all expenses. Two or more selected = AND (expense must carry every selected tag). The tag filter narrows the expense set before grouping; it does not change which columns appear.
- Build a **date-range filter** with the same default as the list (`defaultRangeEt()`), plus a single **Clear** control that resets all filters and the dimension/granularity selectors to defaults.
- Build the result table so its **columns are derived from the dimension** — `category` iff the dimension includes Category, `tag` iff the dimension includes Tag, the time-period column always, plus `count` and `total`. **No percent-of-total column.** **No grand-total row.** Every row stands alone.
- Build the **time-period column formats** (anchored to `America/New_York`): Month → `Mmm` (capitalized abbreviation, e.g. `Jan`); Quarter → `Mmm-Mmm` for calendar quarters (`Jan-Mar`, `Apr-Jun`, `Jul-Sep`, `Oct-Dec`); Year → `YYYY`.
- Build **by-tag double-counting**: when the dimension includes `Tag`, an expense with N tags contributes one row per tag for both `count` and `total`. Build a short inline note on the page explaining this.
- Build **sortable headers**: every column header is clickable to toggle ascending / descending sort by that column. Default sort = group columns ascending (case-insensitive alphabetical for category/tag), then time-period ascending.
- Build an **empty-state** message under the controls when no rows match.
- Build summary aggregation so **recurring/generated expenses** are counted exactly like manual expenses, but only `expense` rows already materialized at query time are included. A future-dated recurring occurrence is never anticipated by the summary; it appears only after the cron (or the dev-only manual trigger from Issue 14) has inserted the row.

Module work:

- Build `expense-repo.summarize` with signature `summarize({ dimension: 'time' | 'category' | 'tag' | 'category-tag'; granularity: 'month' | 'quarter' | 'year'; filters: { from?; to?; tagIds? }; sort? })`. Return rows whose shape matches the requested dimension. No grand total.
- Build `et-date.quarterKeyEt(ymd)` returning the `Mmm-Mmm` label; ensure `monthKeyEt` returns `Mmm` and `yearKeyEt` returns `YYYY` per the PRD; cover with tests (DST + quarter-label casing).
- Build `expense-repo` unit tests covering: all four dimensions × all three granularities, by-tag double-counting, AND tag-filter narrowing, sort toggling on every column, empty-result handling, and that future-dated recurring templates do **not** participate until materialized.

See PRD section _Summaries_, user stories 34–41 (rewritten), and the updated `summarize` and `et-date` interfaces in _Module Design_.

### How to verify

- **Manual**:
  1. Seed expenses across multiple categories and tags with known totals, including at least one expense with ≥ 2 tags.
  2. Visit `/summary`. Confirm defaults: dimension = `Category`, granularity = `Month`, no tag filter, date range = list default; columns are `category | Mmm | count | total`; rows sorted by category asc, then month asc; no grand-total row; no percent column.
  3. Switch dimension through `Time only`, `Tag`, `Category + Tag`; confirm columns add/drop accordingly.
  4. Switch granularity through `Quarter` and `Year`; confirm the time-period column changes label format (`Mmm-Mmm`, `YYYY`).
  5. With dimension `Tag` or `Category + Tag`, confirm the multi-tagged expense contributes once per tag (both `count` and `total`); confirm the inline note is visible.
  6. Apply a tag filter with two tags; confirm only expenses carrying both tags appear in the aggregation.
  7. Click each column header; confirm asc/desc toggling.
  8. Apply a filter that yields no rows; confirm empty-state message.
  9. Click **Clear**; confirm controls return to defaults.
  10. Create a recurring template with an anchor date in the future relative to "today" (use the `/test/set-clock` hook); confirm the summary does not include any row for it. Run `/test/run-cron` after advancing the clock past the anchor; confirm the materialized expense now appears in the summary.
- **Automated**: unit tests for the new `summarize` signature and `quarterKeyEt`. Playwright e2e for each dimension, each granularity, the tag-filter AND narrowing, sort toggling on every column, the empty state, default values, the **Clear** control, and recurring participation only after materialization.

### Acceptance criteria

- [ ] Given no query parameters, when the user visits `/summary`, then dimension = `Category`, granularity = `Month`, no tag filter, date range = list default, sort = group columns asc then time-period asc.
- [ ] Given dimension = `Time only`, when the page renders, then the table has exactly `time-period | count | total` columns.
- [ ] Given dimension = `Category + Tag` with granularity `Quarter`, when the page renders, then columns are `category | tag | quarter | count | total` and quarter labels are `Jan-Mar`, `Apr-Jun`, `Jul-Sep`, `Oct-Dec`.
- [ ] Given an expense with two tags and dimension = `Tag`, when the page renders, then it contributes one row per tag with full `count` and `total`, and an inline note explains the double-count.
- [ ] Given two tags selected as a tag filter (AND), when applied, then only expenses carrying both tags participate in aggregation.
- [ ] Given the user clicks any column header, when the page reloads, then the table sorts by that column ascending; clicking again toggles to descending.
- [ ] Given the table renders, when inspecting the DOM, then there is no grand-total row and no percent-of-total column.
- [ ] Given the filtered result set is empty, when the page renders, then an empty-state message appears instead of a table.
- [ ] Given the user clicks **Clear**, when the page reloads, then dimension, granularity, tag filter, and date range all reset to defaults.
- [ ] Given a recurring template whose next occurrence is in the future, when the user views the summary, then no row attributable to that template appears; after the cron materializes an occurrence, that occurrence participates.

### User stories addressed

- User story 34: Summary page defaults
- User story 35: group-by dimension selector (4 options)
- User story 36: time-period granularity selector
- User story 37: tag filter with AND
- User story 38: date-range filter and Clear control
- User story 39: dimension-driven columns; no grand total; no percent
- User story 40: time-period label formats (`Mmm`, `Mmm-Mmm`, `YYYY`)
- User story 41: sortable headers, empty state, recurring counted only after materialization

---
