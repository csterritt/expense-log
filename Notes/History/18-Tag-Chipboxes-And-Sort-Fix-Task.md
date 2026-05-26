# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Read the file SKILL.md under Notes/skills/issue-to-tasks and do what it says. the issue to write tasks for is @[Notes/issues/18-tag-chipboxes-and-sort-fix.md]  . write the new task file into Notes/tasks.

*Viewed [SKILL.md](file:///Users/chris/hacks/expenses/expense-log/Notes/skills/issue-to-tasks/SKILL.md) *

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md) *

*Listed directory [tasks](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks) *

*Listed directory [lib](file:///Users/chris/hacks/expenses/expense-log/src/lib) *

*Listed directory [db](file:///Users/chris/hacks/expenses/expense-log/src/lib/db) *

*Viewed [17-updated-summary.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/17-updated-summary.md) *

*Listed directory [routes](file:///Users/chris/hacks/expenses/expense-log/src/routes) *

*Viewed [review-issue-18-2.md](file:///Users/chris/hacks/expenses/expense-log/Notes/review-issue-18-2.md) *

*Listed directory [expenses](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses) *

*Listed directory [recurring](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring) *

### Planner Response

I've read the SKILL, the issue, the parent PRD context (existing tasks/17), and explored the affected codebase. Issue 18 is large — it touches 6 surface areas (entry, edit, recurring create/edit, list filter, summary filter), the validator + post/confirm handlers for both expense and recurring, the summary sort, and a JS rewrite. Below is the proposed ordered task list, following the project's RED/GREEN/REFACTOR convention used in `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/17-updated-summary.md`.

# Proposed task list for Issue 18

1. **RED: validator tests for `tagId[]` + `newTags` (mutation form contract)** — new tests in `tests/expense-validators.spec.ts` covering ULID syntax check, count cap (e.g. 64), `newTags` split/trim/lowercase/dedupe, `^[a-z0-9_-]{1,20}$` rejection, raw-length + token-count caps, collision normalization vs existing tags. Depends on: none.
2. **GREEN: implement the new tag input validator** in [src/lib/expense-validators.ts](file:///Users/chris/hacks/expenses/expense-log/src/lib/expense-validators.ts:0:0-0:0) (or sibling), replacing CSV `tags` parsing. Depends on: 1.
3. **REFACTOR: tidy validator** + share helpers with `parseSummaryQuery` / list filter where useful. Depends on: 2.
4. **RED: validator tests for filter-side `tagId[]` (list + summary)** — silent-drop of unknown/invalid ids, truncate to cap, `parseSummaryQuery` dimension-aware sort allow-list fallback (e.g. `sort=tag` with dimension `Category` falls back). Depends on: none.
5. **GREEN: extend `parseSummaryQuery` + list-filter parser** for the dimension-aware allow-list and `tagId` syntactic + cap dropping. Depends on: 4.
6. **REFACTOR: tidy filter parsers**. Depends on: 5.
7. **RED: unit tests for chronological summary sort + year-bearing labels** — `Apr 2026` after `Jan/Feb/Mar 2026`; `Jan-Mar 2026` before `Apr-Jun 2026`; `Dec 2025` before `Jan 2026`; cross-year rows distinct; tie-break on group-then-time when sorting by `count`/`total`/`category`/`tag`; descending toggle uses internal key not label. Depends on: none.
8. **GREEN: chronological sort + label format in [summary-access.ts](file:///Users/chris/hacks/expenses/expense-log/src/lib/db/summary-access.ts:0:0-0:0)** — internal `(year, monthIndex|quarterIndex|year)` key alongside rendered `Mmm YYYY` / `Mmm-Mmm YYYY` / `YYYY` label; replace `localeCompare` ordering. Depends on: 7.
9. **REFACTOR: tidy [summary-access.ts](file:///Users/chris/hacks/expenses/expense-log/src/lib/db/summary-access.ts:0:0-0:0)** (extract key/label helpers; align with `et-date` style). Depends on: 8.
10. **RED: extract shared `tag-chip-checkboxes.tsx` (component-level test or e2e harness)** — verify alphabetical case-insensitive ordering, selected-vs-unselected styling, `name="tagId"` per chip, optional `newTags` text input slot. Depends on: none.
11. **GREEN: build the shared component** at `src/components/tag-chip-checkboxes.tsx` modeled on `renderFilterBar` chips in [expense-list-renderer.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/expense-list-renderer.tsx:0:0-0:0); usable in mutation + filter contexts. Depends on: 10.
12. **GREEN: rewrite client JS as `public/js/tag-chip-checkboxes.js`** — chip-toggle styling + optimistic `newTags` chip rendering via `textContent`/`setAttribute` only; init failures swallowed and logged via `console.error`. Depends on: 11.
13. **REFACTOR: tidy component + JS**. Depends on: 12.
14. **RED: Playwright spec — entry form chip-checkbox + new-tag input** under `e2e-tests/expenses/`. Asserts presence/order/wrap, toggle submit, new-tag confirmation flow, cancel preserves chips + `newTags` text + new-category text, no-JS path, broken-JS path. Depends on: 3, 13.
15. **GREEN: wire entry form** ([expense-form.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/expense-form.tsx:0:0-0:0) + [expense-post-handler.ts](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/expense-post-handler.ts:0:0-0:0)) to the shared component and new validator; remove CSV `tags` field from this form. Depends on: 14.
16. **RED: Playwright spec — expense edit form** mirroring task 14. Depends on: 3, 13.
17. **GREEN: wire edit form** ([build-edit-expense.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/build-edit-expense.tsx:0:0-0:0) + relevant POST handler). Depends on: 16.
18. **RED: Playwright spec — recurring create + edit + recurring confirmation flows**, including new-tag race + new-category race resolution at confirmation time. Depends on: 3, 13.
19. **GREEN: wire recurring forms + handlers** ([build-create-recurring.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring/build-create-recurring.tsx:0:0-0:0), [build-edit-recurring.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring/build-edit-recurring.tsx:0:0-0:0), [recurring-form.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring/recurring-form.tsx:0:0-0:0), `recurring-post-handler.ts`, `recurring-confirm-post-handler.ts`). Depends on: 18.
20. **RED: confirmation hardening tests (unit + e2e)** — server-authoritative revalidation rejects tampered hidden fields (amount, injected `tagId`, swapped category id); confirmation-time category race + tag race silently reuse; atomic transaction (no partial rows on failure); collision normalization (`Food` typed + `food` chip selected → attached once); validation-error preservation across all re-render paths. Depends on: 3.
21. **GREEN: harden expense + recurring confirmation handlers** — full revalidation, transactional create/reuse, race-tolerant tag + category lookup, error-state value preservation. Depends on: 20.
22. **REFACTOR: tidy confirmation handlers** + share race-handling helpers across expense + recurring. Depends on: 21.
23. **RED: Playwright spec — list-page tag filter unification + tampered/excess `tagId` drop**. Depends on: 6, 13.
24. **GREEN: switch list-filter chip render to the shared component** ([expense-list-renderer.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/expense-list-renderer.tsx:0:0-0:0)); preserve AND/OR toggle and `mode` query contract. Depends on: 23.
25. **RED: Playwright spec — Summary tag filter as chip-checkbox + chronological sort + malformed-query fallback** under `e2e-tests/summary/`. Covers `Jan→Apr` ordering, cross-year `Dec 2025 → Jan 2026`, descending header toggle, dimension-aware `sort` fallback, unknown-`tagId` drop, untagged-expense exclusion under `Tag`/`Category+Tag`. Depends on: 6, 9, 13.
26. **GREEN: replace `<select multiple>` in [build-summary.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/build-summary.tsx:0:0-0:0)** with the shared component; preserve `name="tagId"` query contract; render chronological labels and sort links per task 8. Depends on: 25.
27. **REFACTOR: tidy [build-summary.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/build-summary.tsx:0:0-0:0)**. Depends on: 26.
28. **WRITE: cleanup pass** — delete `public/js/tag-chip-picker.js`, every `<script src="/js/tag-chip-picker.js">` reference, the `data-tag-chip-picker` attribute, and the `tagsCsvMax` CSV input field across [expense-form.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/expense-form.tsx:0:0-0:0), [recurring-form.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring/recurring-form.tsx:0:0-0:0), [build-edit-expense.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/build-edit-expense.tsx:0:0-0:0), [build-create-recurring.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring/build-create-recurring.tsx:0:0-0:0), [build-edit-recurring.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/recurring/build-edit-recurring.tsx:0:0-0:0), [expense-list-renderer.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/expense-list-renderer.tsx:0:0-0:0). Verify no rendered page produces a `/js/tag-chip-picker.js` 404. Depends on: 15, 17, 19, 24, 26.
29. **DOCUMENT: wiki update** under `Notes/wiki/` — shared chip-checkbox component, server-authoritative tag input contract, ULID syntactic check + caps, confirmation atomicity + race rules, year-bearing labels, chronological sort with internal keys, dimension-aware sort allow-list. Append a `## [YYYY-MM-DD] ingest | Issue 18: ...` line to `Notes/wiki/log.md`. Depends on: 28.
30. **CODE WALKTHROUGH** under `Notes/walkthroughs/18-tag-chipboxes-and-sort-fix/code-walkthrough/` (`uvx showboat`). Depends on: 29.
31. **UI WALKTHROUGH** under `Notes/walkthroughs/18-tag-chipboxes-and-sort-fix/ui-walkthrough/` covering entry/edit/recurring chip + new-tag flow, list filter, summary filter, chronological sort, no-JS fallback. Depends on: 30.
32. **REVIEW**: human walks the issue's _How to verify_ checklist + acceptance criteria; runs full unit + Playwright suites. Depends on: 31.

Questions before I write the file:

- **Order OK?** In particular: I put confirmation hardening (20–22) after recurring is wired (19) so the same handler hardening covers both expense and recurring confirm. Acceptable, or do you want it earlier?
- **Any too-large tasks?** Tasks 8, 11, 19, 21 are the biggest. I can split (e.g. 11 → component + chip-styling separately, 19 → recurring create vs edit, 21 → expense vs recurring) if you prefer.
- **Any too-small that should merge?** E.g. could merge 11+12 (component + JS) into one GREEN.
- **REVIEW tasks**: only the final task 32. The issue lists no mid-flight human-decision points. OK?

Confirm or tell me what to change and I'll save it to `Notes/tasks/18-tag-chipboxes-and-sort-fix.md`.

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md) *

### User Input

yes, please split tasks 18 & 19 to one pair for category, and one for tag. also please split 20, 21, and 22 to parts for create and edit of recurring expenses. Human review part is okay.

### Planner Response

Interpreting "category/tag" as "create/edit" (matches the follow-on clause). Writing the task file now.

*Edited relevant file*

### Planner Response

Written to `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md`.

# Summary

- **40 tasks** total, RED/GREEN/REFACTOR cadence matching tasks/17.
- **Recurring forms split** into create (tasks 18–19) and edit (tasks 20–21).
- **Confirmation hardening split into three RGR triples**: expense (22–24), recurring-create (25–27), recurring-edit (28–30). Task 24 extracts shared helpers so 26 + 29 reuse them.
- **Final review** kept as a single human REVIEW (task 40).
- I read "category/tag" as "create/edit" — the recurring-create vs recurring-edit split. If you actually meant something else, let me know and I'll resplit.