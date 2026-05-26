## Issue 18: Tag chip-checkbox UI everywhere + chronological time-period sort on Summary

**Type**: AFK
**Blocked by**: Issue 17 (rewritten Summary page), Issue 11 (list search/filter), Issue 7 (progressive-enhancement JS), Issue 13 (recurring CRUD)

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Two related changes that affect the tag-input UI in three places and the sort behavior of the Summary table:

1. **Unify the tag-selection UI as a chip-checkbox block.** On every page where a user selects tags — the expense entry form, the recurring-template form, the expense edit page, the list-page tag filter, and the Summary tag filter — render every existing tag as a labeled `<input type="checkbox">` styled as a chip, alphabetically sorted (case-insensitive), wrapping to the viewport. Selected chips must be visually distinct from unselected ones. The list-page tag-filter UI (`renderFilterBar` in `expense-list-renderer.tsx`) already implements this pattern with `flex-wrap` / `gap-2` and per-tag checkboxes; use it as the reference and extract a shared component (e.g. `src/components/tag-chip-checkboxes.tsx`) that is reused everywhere.

2. **Inline new-tag input on entry/recurring forms only.** On the expense entry form, the expense edit form, and the recurring-template form (create + edit), render a small text input adjacent to the chip block that accepts one or more new tag names (comma- or whitespace-separated). New names flow through the existing inline-create confirmation page (same flow used today for new categories and the current CSV tag input). The list-page filter and the Summary-page filter do **not** get the new-tag input — they only operate over existing tags.

3. **Replace the existing tag input mechanism.** The forms currently submit a CSV string via a single `tags` text input enhanced by `public/js/tag-chip-picker.js`. Replace this with:
   - server-rendered native `<input type="checkbox" name="tagId" value="<tagId>">` chips for existing tags,
   - a separate `<input type="text" name="newTags">` for new tag names,
   - a renamed/rewritten `public/js/tag-chip-checkboxes.js` whose only job is to (a) style the chip toggle interaction and (b) optimistically render typed new-tag names as already-selected chips. Without JS, native checkboxes continue to work and `newTags` is submitted as-is to the confirmation page.
   Update `expense-validators` and the post/confirm handlers (`expense-post-handler.ts`, `expense-confirm-post-handler.ts`, and the recurring equivalents) to read `tagId[]` + `newTags` instead of the CSV `tags` field. Preserve the existing inline-create confirmation flow end-to-end; new tag names ≤ 20 chars, trim/dedupe, lowercase normalization unchanged.

4. **Replace the Summary tag filter `<select multiple>` with the shared chip-checkbox block.** In `build-summary.tsx`, swap the current `<select id="summary-tag-filter" multiple>` for the same shared component used on entry/list, preserving the `name="tagId"` query-string contract (the existing `parseSummaryQuery` already accepts `tagId[]`).

5. **Time-period column sorts chronologically, never alphabetically.** In `src/lib/db/summary-access.ts`, the current implementation sorts rows by `timePeriod` using `localeCompare`, which puts `Apr` before `Feb` and `Apr-Jun` before `Jan-Mar`. Replace the time-period comparator with a chronological one:
   - Month granularity (`Jan`…`Dec`) → calendar-month index 0..11.
   - Quarter granularity (`Jan-Mar`, `Apr-Jun`, `Jul-Sep`, `Oct-Dec`) → quarter index 0..3 (key off the first month of the label).
   - Year granularity (`YYYY`) → numeric.
   Apply chronological ordering both in the **default sort** (group columns asc, then time-period chronologically asc) and when the user clicks the time-period column header (toggles asc/desc but always chronological). The category/tag column comparators remain case-insensitive alphabetical; `count` and `total` remain numeric. Forbid alphabetical sort of the time-period label anywhere in the codebase.

6. **Cleanup.** Delete `public/js/tag-chip-picker.js` and every `<script src="/js/tag-chip-picker.js">` reference (in `expense-form.tsx`, `recurring-form.tsx`, `build-edit-expense.tsx`, `build-create-recurring.tsx`, `build-edit-recurring.tsx`, `expense-list-renderer.tsx`) once the new component is in place. Remove the now-unused `data-tag-chip-picker` attribute and the `tagsCsvMax`-based CSV input field on those forms. The CSV-parsing path in the validators and post handlers can be removed if and only if no other caller depends on it.

See PRD sections _Solution_, user stories 7–10 (entry), 14 (no-JS fallback), 31 (list filter), 37 (summary filter), 41 (chronological sort), and _Implementation Decisions_ → _Summaries_ (Sort), _Forms and validation_, and _Client JS (progressive enhancement)_.

### How to verify

- **Manual**:
  1. With existing tags `food`, `gift`, `restaurant`, `lego`, visit the expense entry form. Confirm every tag appears as a chip-checkbox, alphabetically sorted, wrapping at narrow widths, with selected chips visually distinct.
  2. Toggle two chips on, submit a new expense; confirm both tags attach.
  3. Type two new names in the "new tags" input, submit; confirm the consolidated confirmation page lists both new tags (plus any new category) and that confirming creates them atomically and attaches them to the expense.
  4. Cancel from the confirmation page; confirm all chip selections and the new-tags text are preserved.
  5. Repeat (1)–(4) on the expense edit page and on the recurring create + edit pages.
  6. Visit the list page; confirm the filter bar's tag chips are unchanged in behaviour and visually consistent with the entry form's chip block.
  7. Visit `/summary`; confirm the tag filter is now a chip-checkbox block (no `<select multiple>`), AND semantics preserved, two-tag filter narrows the aggregation correctly.
  8. Seed expenses across `Jan`, `Feb`, `Mar`, `Apr` (e.g. via `/test/set-clock`) with the same category. On `/summary` with default sort, confirm the time-period column reads `Jan, Feb, Mar, Apr` top-to-bottom — **not** `Apr, Feb, Jan, Mar`.
  9. Switch granularity to `Quarter`; confirm `Jan-Mar` precedes `Apr-Jun` precedes `Jul-Sep` precedes `Oct-Dec`.
  10. Click the time-period column header; confirm sort toggles to descending chronological (`Dec…Jan` or `Oct-Dec…Jan-Mar`), not reverse-alphabetical.
  11. Disable JavaScript and repeat (1)–(3): native checkboxes work; the new-tags text input is submitted and handled by the confirmation page.
- **Automated**: extend the Playwright suite for entry, edit, recurring, list filter, and summary to assert the chip-checkbox UI (presence, alphabetical order, selection state, wrapping), the no-JS new-tag flow, and the chronological time-period sort (Month and Quarter). Extend the `expense-repo` / `summary-access` unit tests with the exact ordering assertion described in the PRD's _Testing Decisions_ (`Apr` follows `Jan/Feb/Mar`, `Apr-Jun` follows `Jan-Mar`, regardless of alphabetical order). Add unit tests for the new tag-chip-checkboxes component if extracted with logic worth covering.

### Acceptance criteria

- [ ] Given existing tags, when the user opens the expense entry form, then every tag is rendered as a chip-checkbox, alphabetically sorted (case-insensitive), wrapping to the viewport.
- [ ] Given the user toggles chips and submits, when the expense is created, then exactly the selected tags are attached and duplicates are structurally impossible.
- [ ] Given the user types new tag names in the adjacent text input and submits, when the confirmation page renders, then it lists every new tag (and any new category) and the full expense data; confirming creates them atomically and attaches them.
- [ ] Given the user cancels the confirmation, when the entry form re-renders, then chip selections and the new-tags text are preserved.
- [ ] Given the expense edit page and the recurring create/edit pages, when the user views them, then they use the same chip-checkbox block + new-tag input as the entry form.
- [ ] Given the Summary page, when the user views the tag filter, then it is a chip-checkbox block (not a `<select multiple>`), reuses the shared component, has no new-tag input, and preserves AND semantics for two or more selected tags.
- [ ] Given the list-page filter bar and the entry form, when both are rendered, then they use the same shared chip-checkbox component (single source of truth).
- [ ] Given `/js/tag-chip-picker.js` is deleted, when any form page loads, then no 404 is logged and the chip UI works (with or without JS).
- [ ] Given expenses across Jan–Apr and default sort, when the Summary table renders with Month granularity, then rows appear in calendar order (`Jan, Feb, Mar, Apr`).
- [ ] Given expenses across all four calendar quarters and default sort, when the Summary table renders with Quarter granularity, then rows appear `Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec`.
- [ ] Given the user clicks the time-period column header, when the table re-renders, then sort toggles between chronological ascending and chronological descending — never alphabetical of the rendered label.
- [ ] Given category + time-period combined sort, when the table renders, then category sorts case-insensitive alphabetical ascending and ties break on chronological time-period.
- [ ] Given JavaScript is disabled, when the user submits the entry form with chip selections and new-tag text, then the confirmation page handles both correctly and the round-trip preserves all values.

### User stories addressed

- User story 7: tag chip-checkbox block (alphabetical, wrapping)
- User story 8: toggle chip to select/deselect
- User story 9: structural uniqueness via checkboxes
- User story 10: inline new-tag input on entry forms
- User story 14: no-JS fallback for category and tag inputs
- User story 31: list-page tag filter as shared chip-checkbox block
- User story 37: summary tag filter as shared chip-checkbox block
- User story 41: chronological time-period sort on Summary (Month and Quarter), never alphabetical

---
