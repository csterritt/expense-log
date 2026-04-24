## Issue 11: Search and filters on the expense list

**Type**: AFK
**Blocked by**: Issue 8

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Add a filter bar above the expense list:

- A single description search input (case-insensitive substring).
- Date-range inputs (`from`, `to`), each independently optional, defaulting on first load to `defaultRangeEt()` (first of the month two months prior through today).
- A category select (zero or one).
- A tag multi-select plus an AND/OR toggle controlling tag-internal semantics.
- A "Clear filters" control that resets to the defaults.

Filters combine with AND across fields; tag-internal semantics are governed by the toggle (OR = any-tag-matches, AND = all-tags-must-match). Extend `expense-repo.listExpenses` to accept all filter parameters, using case-insensitive `LIKE` for description, `YYYY-MM-DD` string comparison for date bounds, category-id equality, and a subquery/group-by for the tag AND case.

See PRD section _Search and filter_, user stories 27–33.

### How to verify

- **Manual**:
  1. Seed a varied dataset; apply each filter individually and in combination; confirm expected rows.
  2. Toggle tag AND/OR; confirm the row set changes accordingly.
  3. Use Clear filters; confirm the form returns to the default window.
- **Automated**: Playwright e2e exercises description search, each date-range edge (open-from, open-to, both), category filter, tag OR, tag AND, combined filters, and Clear filters.

### Acceptance criteria

- [ ] Given a description substring, when submitted, then the list shows only rows whose description contains that substring case-insensitively.
- [ ] Given open-ended date ranges (from-only, to-only, both-absent), when submitted, then the list filters correctly.
- [ ] Given tag AND with two tags, when submitted, then only expenses having both tags appear.
- [ ] Given tag OR with two tags, when submitted, then expenses having at least one appear.
- [ ] Given all filters set, when submitted, then results are the AND combination (with tag-internal governed by the toggle).
- [ ] Given the user clicks Clear filters, when the page reloads, then filters return to defaults.

### User stories addressed

- User story 27: description substring search
- User story 28: date range with optional bounds
- User story 29: default date range on first load
- User story 30: category filter (zero or one)
- User story 31: tag filter with AND/OR toggle
- User story 32: AND across fields
- User story 33: clear filters

---
