## Issue 12: Summary page

**Type**: AFK
**Blocked by**: Issue 11

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Flesh out `/summary`:

- A single grouping selector with three options: Category, Tag, Date.
- When Date is selected, a granularity selector appears with Month or Year (default Month).
- A date-range filter with the same default and open-ended behavior as the list filter (first of two months ago → today on first load).
- Default grouping on first visit: Category.
- Results table columns: group name, count of expenses, total amount (formatted), percent of overall total.
- Sort by total amount descending by default.
- When grouping is Tag, an expense with multiple tags is counted in full under each of its tags. Add a short in-UI note explaining this ("Multi-tagged expenses count fully under each tag; percentages may sum to > 100%."). Percent of total is relative to the sum of tagged-row totals.
- If the filtered set is empty, show an empty-state message instead of a table.

Extend `expense-repo.summarize(grouping, granularity, filters)` with unit tests covering the arithmetic (especially by-tag double-counting and percent-of-total calculation).

Add `et-date.monthKeyEt` and `yearKeyEt` for Date grouping; tests include DST boundary dates.

See PRD section *Summaries*, user stories 34–41.

### How to verify

- **Manual**:
  1. Seed expenses across multiple categories and tags with known totals.
  2. Visit `/summary`; confirm Category grouping is default and table sorted by total desc.
  3. Switch to Tag; confirm multi-tagged expenses appear under each tag at full amount, and the in-UI note is visible.
  4. Switch to Date; confirm the granularity selector appears and Month groups make sense; switch to Year.
  5. Apply a date-range filter; confirm table updates.
  6. Apply a filter that yields no rows; confirm empty-state message.
- **Automated**: unit tests of `summarize`. Playwright e2e for each grouping, the granularity selector, by-tag double counting, empty state, and the default grouping/sort.

### Acceptance criteria

- [ ] Given no grouping query parameter, when the user visits `/summary`, then the grouping is Category and sort is total desc.
- [ ] Given Tag grouping, when an expense with two tags is present, then its full amount appears under each tag and percentages are computed relative to the sum of tagged-row totals.
- [ ] Given Date grouping with Month granularity, when multiple months of data exist, then each month appears with count and total.
- [ ] Given the filtered result set is empty, when the page renders, then an empty-state message appears instead of a table.

### User stories addressed

- User story 34: grouping selector (Category / Tag / Date)
- User story 35: columns group, count, total, percent
- User story 36: default sort by total desc
- User story 37: date-range filter with shared defaults
- User story 38: Date granularity selector
- User story 39: default grouping Category
- User story 40: by-Tag double counting
- User story 41: empty-state message

---
