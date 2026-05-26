## Issue 18: Tag chip-checkbox UI everywhere + chronological time-period sort on Summary

**Type**: AFK
**Blocked by**: Issue 17 (rewritten Summary page), Issue 11 (list search/filter), Issue 7 (progressive-enhancement JS), Issue 13 (recurring CRUD)

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Two related changes that affect the tag-input UI in three places and the sort/labeling behavior of the Summary table, plus the server-side contracts, safe-rendering rules, and error-handling that keep both correct under tampering or partial failure:

1. **Unify the tag-selection UI as a chip-checkbox block.** On every page where a user selects tags — the expense entry form, the recurring-template form, the expense edit page, the list-page tag filter, and the Summary tag filter — render every existing tag as a labeled `<input type="checkbox">` styled as a chip, alphabetically sorted (case-insensitive), wrapping to the viewport. Selected chips must be visually distinct from unselected ones. The list-page tag-filter UI (`renderFilterBar` in `expense-list-renderer.tsx`) already implements this pattern with `flex-wrap` / `gap-2` and per-tag checkboxes; use it as the reference and extract a shared component (e.g. `src/components/tag-chip-checkboxes.tsx`) that is reused everywhere.

2. **Inline new-tag input on mutation forms only** (expense create, expense edit, recurring create, recurring edit). On every mutation form, render a small text input adjacent to the chip block that accepts one or more new tag names (comma- or whitespace-separated). New names flow through the existing inline-create confirmation page (same flow used today for new categories and the current CSV tag input). The list-page filter and the Summary-page filter do **not** get the new-tag input — they only operate over existing tags.

3. **Replace the existing tag input mechanism.** The forms currently submit a CSV string via a single `tags` text input enhanced by `public/js/tag-chip-picker.js`. Replace this with:
   - server-rendered native `<input type="checkbox" name="tagId" value="<tagId>">` chips for existing tags,
   - a separate `<input type="text" name="newTags">` for new tag names,
   - a renamed/rewritten `public/js/tag-chip-checkboxes.js` whose only job is to (a) style the chip toggle interaction and (b) optimistically render typed new-tag names as already-selected chips using safe DOM APIs (`textContent`, never `innerHTML`). Optimistic chips are visual only — the submitted form data still flows through the existing native fields. JS init failures must be swallowed (logged via `console.error`) and must not block native checkbox toggling or form submission. Without JS, native checkboxes continue to work and `newTags` is submitted as-is to the confirmation page.
   Update `expense-validators` and the post/confirm handlers (`expense-post-handler.ts`, `expense-confirm-post-handler.ts`, and the recurring equivalents) to read `tagId[]` + `newTags` instead of the CSV `tags` field, applying the **server-authoritative tag input contract** (see _Server contract_ below). Preserve the existing inline-create confirmation flow end-to-end; new tag names ≤ 20 chars, trim/dedupe, lowercase, letters, digits, hyphens and underscores only normalization unchanged.

4. **Replace the Summary tag filter `<select multiple>` with the shared chip-checkbox block.** In `build-summary.tsx`, swap the current `<select id="summary-tag-filter" multiple>` for the same shared component used on entry/list, preserving the `name="tagId"` query-string contract (the existing `parseSummaryQuery` already accepts `tagId[]`). Continue to require signed-in access on every affected page and POST handler (entry, edit, recurring create/edit, confirmation routes, list filter, Summary). The list-page tag filter retains its existing AND/OR toggle and `mode=and|or` query-string contract unchanged.

5. **Time-period column sorts chronologically, never alphabetically; labels include the year.** In `src/lib/db/summary-access.ts`, the current implementation sorts rows by `timePeriod` using `localeCompare`, which puts `Apr` before `Feb` and `Apr-Jun` before `Jan-Mar`. Replace this with an internal chronological key carried alongside the rendered label:
   - Month granularity → key `(year, monthIndex 0..11)`; rendered label `Mmm YYYY` (e.g. `Mar 2026`).
   - Quarter granularity → key `(year, quarterIndex 0..3)`; rendered label `Mmm-Mmm YYYY` (e.g. `Jan-Mar 2026`).
   - Year granularity → key `year` (numeric); rendered label `YYYY`.
   Month and Quarter rows are keyed by `(year, index)` so rows from different calendar years are distinct rows and never aggregate together (e.g. `Mar 2025` and `Mar 2026` are separate rows). Apply chronological ordering both in the **default sort** (group columns asc, then time-period chronologically asc by the internal key) and when the user clicks the time-period column header (toggles asc/desc but always uses the internal key, never the rendered label). The category/tag column comparators remain case-insensitive alphabetical; `count` and `total` remain numeric. **No code path in the Summary sort may compare rendered month or quarter labels alphabetically.** When the user clicks `count`, `total`, `category`, or `tag`, ties retain the default group/time ordering (group columns asc, then chronological time-period asc). Validate the `sort` query input against an allow-list of column names and directions; fall back to defaults on unknown values rather than erroring.

6. **Cleanup.** Delete `public/js/tag-chip-picker.js` and every `<script src="/js/tag-chip-picker.js">` reference (in `expense-form.tsx`, `recurring-form.tsx`, `build-edit-expense.tsx`, `build-create-recurring.tsx`, `build-edit-recurring.tsx`, `expense-list-renderer.tsx`) once the new component is in place. After cleanup, no rendered page may produce a 404 for `/js/tag-chip-picker.js`. Remove the now-unused `data-tag-chip-picker` attribute and the `tagsCsvMax`-based CSV input field on those forms. The CSV-parsing path in the validators and post handlers can be removed if and only if no other caller depends on it.

7. **Server contract for submitted tags** (applies to mutation forms, the list filter, and the Summary filter; never trust the UI):
   - **`tagId`**: zero or more repeated form/query values. Server dedupes repeated ids, then validates that each remaining id exists.
     - Mutation forms: an unknown or stale `tagId` (e.g. tag deleted between page render and submit) renders a recoverable global error on the form with all other field values preserved.
     - List filter / Summary filter: unknown `tagId` values are silently dropped; the page still renders.
   - **`newTags`** (mutation forms only): split on commas and whitespace, then trim → lowercase → drop empty tokens → letters, digits, hyphens and underscores only -> dedupe case-insensitively. Reject per-token names > 20 chars. Cap raw `newTags` length (e.g. 500 chars) and post-split token count (e.g. 32 tokens); exceeding either is a recoverable validation error.
   - **Collision** between `tagId` and `newTags`: if a normalized `newTags` token matches the lowercase name of any existing tag (selected or not), treat it as a selection of the existing tag — do not create a confirmation entry for an already-existing name; do not double-attach.
   - **Confirmation-time race**: if another request creates a tag with the same name between the initial submit and the confirmation submit, the confirm handler must reuse the now-existing tag (silently attach it) rather than failing with a generic unique-constraint error. Other unique-constraint failures surface a recoverable user-facing message that re-renders the confirmation page with all values preserved.
   - **Validation-error preservation**: every re-render path — form validation errors, confirmation cancel, confirmation-time conflict, edit-form errors, recurring-form errors — preserves chip selections, `newTags` text, the new-category text, and all other field values.
   - **Safe rendering**: tag names, new-tag tokens, category names, and any other user-controlled value rendered into chip labels, hidden/preserved inputs, error messages, and confirmation pages must be HTML-escaped server-side (rely on JSX's default escaping; never `dangerouslySetInnerHTML`). Client JS must build optimistic chips with `textContent` and `setAttribute` only.
   - **Logging**: validation errors are not logged as server errors. Unexpected server errors log route + error class + stack; never log raw form bodies, query strings, descriptions, amounts, or tag/category names.

8. **Malformed Summary query handling**: handlers must never 500 on bad input. Unknown `tagId` values are silently dropped; invalid `dimension`, `granularity`, sort column name, or sort direction fall back to defaults; non-`YYYY-MM-DD` `from` / `to` values are treated as absent.

See PRD sections _Solution_, user stories 7–10 (entry), 14 (no-JS fallback), 31 (list filter), 37 (summary filter), 40 (year-included labels), 41 (chronological sort + tie-breakers), and _Implementation Decisions_ → _Summaries_ (Sort, time-period aggregation keys, malformed query parameters), _Forms and validation_, _Tag input contract (server-authoritative)_, _Safe rendering of user-controlled values_, _Error handling and logging_, and _Client JS (progressive enhancement)_.

### How to verify

- **Manual**:
  1. With existing tags `food`, `gift`, `restaurant`, `lego`, visit the expense entry form. Confirm every tag appears as a chip-checkbox, alphabetically sorted, wrapping at narrow widths, with selected chips visually distinct.
  2. Toggle two chips on, submit a new expense; confirm both tags attach.
  3. Type two new names in the "new tags" input, submit; confirm the consolidated confirmation page lists both new tags (plus any new category) and that confirming creates them atomically and attaches them to the expense.
  4. Cancel from the confirmation page; confirm all chip selections and the new-tags text are preserved.
  5. Repeat (1)–(4) on the expense edit page and on the recurring create + edit pages.
  6. Visit the list page; confirm the filter bar's tag chips are unchanged in behaviour and visually consistent with the entry form's chip block.
  7. Visit `/summary`; confirm the tag filter is now a chip-checkbox block (no `<select multiple>`), AND semantics preserved, two-tag filter narrows the aggregation correctly.
  8. Seed expenses across `Jan`, `Feb`, `Mar`, `Apr` of one year (e.g. via `/test/set-clock`) with the same category. On `/summary` with default sort, confirm the time-period column reads `Jan 2026, Feb 2026, Mar 2026, Apr 2026` top-to-bottom — **not** `Apr…, Feb…, Jan…, Mar…`.
  9. Switch granularity to `Quarter`; confirm `Jan-Mar 2026` precedes `Apr-Jun 2026` precedes `Jul-Sep 2026` precedes `Oct-Dec 2026`.
  10. Click the time-period column header; confirm sort toggles to descending chronological (`Dec…→Jan…` or `Oct-Dec…→Jan-Mar…`), not reverse-alphabetical.
  11. Seed expenses in `Dec 2025` and `Jan 2026` with the same category; confirm two distinct rows render (no cross-year aggregation) and `Dec 2025` sorts before `Jan 2026` in default ascending order.
  12. Submit a form with a tampered/duplicated `tagId` that does not exist (e.g. via DevTools); confirm the mutation form shows a recoverable global error with all other values preserved, while the list filter and `/summary` simply ignore the unknown id.
  13. On the entry form, select existing tag `food` via chip and also type `Food` in the new-tags input; submit. Confirm the confirmation page does not list `food` as a new tag and the resulting expense has `food` attached exactly once.
  14. Type a new tag name on the entry form, navigate to confirmation, then in another tab create that tag through the Tags page; submit confirmation. Confirm the existing tag is silently reused (no error) and is attached to the expense.
  15. Visit `/summary?dimension=bogus&granularity=zzz&sort=foo&direction=sideways&tagId=does-not-exist&from=not-a-date`; confirm the page renders with default dimension/granularity/sort, no 500.
  16. Disable JavaScript and repeat (1)–(3): native checkboxes work; the new-tags text input is submitted and handled by the confirmation page. Also confirm that injecting a broken `tag-chip-checkboxes.js` (e.g. by editing the file to throw on init) does not block native checkbox toggling or form submission.
- **Automated**: extend the Playwright suite for entry, edit, recurring, list filter, and summary to assert the chip-checkbox UI (presence, alphabetical order, selection state, wrapping), the no-JS new-tag flow, the chronological time-period sort (Month and Quarter, including cross-year ordering and within-year tie-breakers when sorting by other columns), the malformed-query fallback on `/summary`, and the tampered-`tagId` recoverable-error path on mutation forms. Extend the `expense-repo` / `summary-access` unit tests with the exact ordering assertion described in the PRD's _Testing Decisions_ (`Apr 2026` follows `Jan/Feb/Mar 2026`, `Apr-Jun 2026` follows `Jan-Mar 2026`, `Dec 2025` precedes `Jan 2026`, regardless of alphabetical order; Month/Quarter rows from different years remain distinct). Add unit tests for the `newTags` normalization (split, trim, lowercase, drop empty, dedupe, > 20-char rejection, raw-length and token-count caps), the `tagId` + `newTags` collision rule, and the confirmation-time race resolution. Add unit tests for the new tag-chip-checkboxes component if extracted with logic worth covering.

### Acceptance criteria

- [ ] Given existing tags, when the user opens the expense entry form, then every tag is rendered as a chip-checkbox, alphabetically sorted (case-insensitive), wrapping to the viewport.
- [ ] Given the user toggles chips and submits, when the expense is created, then exactly the selected tags are attached, the server dedupes any repeated `tagId` values in the submitted body, and duplicates on the resulting expense are structurally impossible.
- [ ] Given a tampered submission with a `tagId` that does not exist, when the mutation form is posted, then the form re-renders with a recoverable global error and all other field values preserved (no 500).
- [ ] Given the user types new tag names in the adjacent text input and submits, when the confirmation page renders, then it lists every new tag (and any new category) and the full expense data; the server has split/trimmed/lowercased/deduped `newTags`, dropped empty tokens, and rejected any token > 20 chars or any submission exceeding the raw-length / token-count caps with a recoverable error; confirming creates them atomically and attaches them.
- [ ] Given the user types a new-tag name that matches an existing tag (case-insensitively), when submitted, then the confirmation page does not list it as a new tag and the existing tag is attached exactly once.
- [ ] Given another request creates the same new tag between the initial submit and the confirmation submit, when the user confirms, then the existing tag is silently reused and attached without error.
- [ ] Given the user cancels the confirmation, or the form re-renders due to any validation error (entry, edit, recurring create/edit, confirmation conflict), when the form re-renders, then chip selections, the new-tags text, the new-category text, and all other field values are preserved.
- [ ] Given the expense edit page and the recurring create/edit pages, when the user views them, then they use the same chip-checkbox block + new-tag input as the entry form.
- [ ] Given the Summary page, when the user views the tag filter, then it is a chip-checkbox block (not a `<select multiple>`), reuses the shared component, has no new-tag input, and preserves AND semantics for two or more selected tags.
- [ ] Given the list-page filter bar and the entry form, when both are rendered, then they use the same shared chip-checkbox component (single source of truth); the list-page filter retains its existing AND/OR toggle and `mode=and|or` query-string contract unchanged.
- [ ] Given any affected page or POST handler, when an unauthenticated request is made, then it redirects to sign-in (auth gating preserved on entry, edit, recurring create/edit, confirmation routes, list, and Summary).
- [ ] Given `/js/tag-chip-picker.js` is deleted, when any form page loads, then no 404 is logged and the chip UI works (with or without JS).
- [ ] Given `tag-chip-checkboxes.js` throws during init, when the user interacts with the form, then native checkboxes still toggle and the form still submits successfully.
- [ ] Given a tag name containing HTML metacharacters (e.g. `<script>`), when it is rendered as a chip label, in confirmation entries, in error messages, or as an optimistic JS chip, then the characters are escaped (server: JSX default; client: `textContent`) and no script executes.
- [ ] Given expenses across Jan–Apr of one year and default sort, when the Summary table renders with Month granularity, then rows appear in calendar order (`Jan 2026, Feb 2026, Mar 2026, Apr 2026`).
- [ ] Given expenses across all four calendar quarters of one year and default sort, when the Summary table renders with Quarter granularity, then rows appear `Jan-Mar 2026, Apr-Jun 2026, Jul-Sep 2026, Oct-Dec 2026`.
- [ ] Given expenses in `Dec 2025` and `Jan 2026` with the same category, when the Summary table renders, then two distinct rows appear (no cross-year aggregation) and `Dec 2025` sorts before `Jan 2026` in default ascending order.
- [ ] Given the user clicks the time-period column header, when the table re-renders, then sort toggles between chronological ascending and chronological descending using the internal `(year, monthIndex|quarterIndex)` key — never alphabetical of the rendered label.
- [ ] Given category + time-period combined sort, when the table renders, then category sorts case-insensitive alphabetical ascending and ties break on chronological time-period ascending.
- [ ] Given the user clicks `count`, `total`, `category`, or `tag`, when the table re-renders, then ties retain the default group/time ordering (group columns ascending, then chronological time-period ascending).
- [ ] Given a request to `/summary` with malformed parameters (unknown `tagId`, unknown `dimension`, unknown `granularity`, unknown sort column or direction, non-`YYYY-MM-DD` `from`/`to`), when the page renders, then unknown values fall back to defaults (or are dropped, for `tagId`) and no 500 occurs.
- [ ] Given JavaScript is disabled, when the user submits the entry form with chip selections and new-tag text, then the confirmation page handles both correctly and the round-trip preserves all values.

### User stories addressed

- User story 7: tag chip-checkbox block (alphabetical, wrapping)
- User story 8: toggle chip to select/deselect
- User story 9: structural uniqueness via checkboxes
- User story 10: inline new-tag input on entry forms
- User story 14: no-JS fallback for category and tag inputs
- User story 40: time-period labels include the year (`Mmm YYYY` / `Mmm-Mmm YYYY` / `YYYY`); Month/Quarter rows do not aggregate across years
- User story 31: list-page tag filter as shared chip-checkbox block
- User story 37: summary tag filter as shared chip-checkbox block
- User story 41: chronological time-period sort on Summary (Month and Quarter), never alphabetical

---
