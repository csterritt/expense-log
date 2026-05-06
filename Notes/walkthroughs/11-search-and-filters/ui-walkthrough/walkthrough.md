# Issue 11 — Expense List Filter Bar UI Walkthrough

*2026-05-06T00:45:43Z by Showboat 0.6.1*
<!-- showboat-id: 2ee2e586-d977-4f2e-8d74-db8ec5abd8bb -->

## Purpose

Visual proof that the /expenses page filter bar correctly handles all user-facing filtering flows added by Issue 11: description substring search, date-range edges (from-only, to-only, both, neither), category dropdown, tag OR, tag AND, combined multi-field filters, and the Clear filters link.

This walkthrough describes nine scenes that correspond to the test cases in e2e-tests/expenses/14-filter-description-dates.spec.ts, 15-filter-category-tags.spec.ts, and 16-filter-combined-clear.spec.ts.

1. First load — default 2-month window is applied with no filter params in the URL.
2. Description search — case-insensitive substring match.
3. Date range — from-only, to-only, both, and neither edge cases.
4. Category filter — dropdown narrows to one category; all-categories returns all.
5. Tag OR filter — any selected tag matches.
6. Tag AND filter — only expenses with all selected tags match.
7. Combined filters — description + from + category together.
8. Clear filters — appears when active, resets everything on click.
9. No-match empty state + Clear recovers results.

The shell commands use Playwright and assume the dev server is running at http://localhost:3000 with the database seeded via the test endpoints. Re-execute with uvx showboat verify to refresh captures.

## Setup

Start the dev server in another terminal:

```
npm run dev
```

Then start a visible Chrome session for captures:

```
uvx rodney start --show
```

Screenshots are saved alongside this walkthrough as scene-*.png and embedded via uvx showboat image.

## Scene 1 — First load: default 2-month window

Sign in and navigate to /expenses with no query string. The URL is exactly http://localhost:3000/expenses with no ? suffix.

Expect:
- expense-filter-bar is visible.
- filter-description, filter-from, filter-to are all empty.
- filter-clear is NOT present (no active filters on first load).
- Only expenses within the default 2-month ET window are shown. An expense dated more than 2 months ago does not appear in the list; an expense dated within the window does appear.

Verified by: e2e-tests/expenses/14-filter-description-dates.spec.ts > 'first load shows default 2-month window (no filter params)'.

## Scene 2 — Description search: substring, case-insensitive

Seed three expenses on today's date: 'Grocery Store', 'GROCERY ONLINE', 'Gas Station' (different category). Navigate to /expenses.

Type 'grocery' into filter-description and click filter-submit. Expect:
- URL contains ?description=grocery (plus any other params the form serialises).
- expense-row-description cells contain 'Grocery Store' and 'GROCERY ONLINE'.
- 'Gas Station' is NOT visible.
- filter-description input retains 'grocery' (sticky values).
- filter-clear IS visible (an active filter is set).

Verified by: e2e-tests/expenses/14-filter-description-dates.spec.ts > 'description filter: substring, case-insensitive'.

## Scene 3 — Date range edges: from-only, to-only, both, neither

Seed two expenses: one dated 2024-03-15 ('March expense'), one dated 2024-01-10 ('January expense'). Navigate to /expenses.

Sub-scene 3a — from-only: fill filter-from with '2024-03-01', leave filter-to empty, click filter-submit. Expect: 'March expense' visible; 'January expense' NOT visible.

Sub-scene 3b — to-only: clear filter-from, fill filter-to with '2024-02-01', click filter-submit. Expect: 'January expense' visible; 'March expense' NOT visible.

Sub-scene 3c — both from and to: fill filter-from '2024-01-01' and filter-to '2024-12-31', click filter-submit. Expect: both expenses visible.

Sub-scene 3d — neither: clear both inputs, click filter-submit. Expect: both expenses visible (no date constraint; explicit submit with empty dates applies no date filter).

Verified by: e2e-tests/expenses/14-filter-description-dates.spec.ts > 'from date filter excludes earlier expenses', 'to date filter excludes later expenses', 'open-from...', 'open-to...', 'no-filters submit...'.

## Scene 4 — Category filter: dropdown narrows results; all-categories returns all

Seed two expenses on today's date: 'Food expense' (category 'food'), 'Utilities expense' (category 'utilities'). Navigate to /expenses.

Sub-scene 4a — category 'food': open the filter-category select and choose the 'food' option. Click filter-submit. Expect: 'Food expense' visible; 'Utilities expense' NOT visible. The select retains 'food' as the selected option.

Sub-scene 4b — all categories: select the first (empty-value) 'All categories' option. Click filter-submit. Expect: both expenses visible.

Verified by: e2e-tests/expenses/15-filter-category-tags.spec.ts > 'category dropdown filters results...' and 'all-categories option returns all'.

## Scene 5 — Tag OR filter: any selected tag matches

Seed four expenses on today: 'Work only' (tag: work), 'Personal only' (tag: personal), 'Both tags' (tags: work, personal), 'No tags' (no tags). Navigate to /expenses.

In the filter-tags section, check filter-tag-work AND filter-tag-personal. Confirm the any/all radio shows filter-tag-mode-or selected (it defaults to 'or'). Click filter-submit.

Expect:
- 'Work only' visible.
- 'Personal only' visible.
- 'Both tags' visible.
- 'No tags' NOT visible.

This is the OR semantic: the expense must have at least one of the selected tags.

Verified by: e2e-tests/expenses/15-filter-category-tags.spec.ts > 'tag OR filter returns expenses with any of the listed tags'.

## Scene 6 — Tag AND filter: only expenses with ALL selected tags

Same seed as Scene 5 (work, personal, both, no-tags expenses). Navigate to /expenses.

Check filter-tag-work AND filter-tag-personal. Then click filter-tag-mode-and to switch the radio to 'All'. Click filter-submit.

Expect:
- 'Work only' NOT visible.
- 'Personal only' NOT visible.
- 'Both tags' visible.
- 'No tags' NOT visible.

This is the AND semantic: the expense must carry every selected tag simultaneously. This is the tag-internal AND/OR distinction. Note that across fields (e.g. combining a description filter with the AND tag mode) the fields are always combined with AND between them — only the tag-internal join logic changes between OR/AND.

Verified by: e2e-tests/expenses/15-filter-category-tags.spec.ts > 'tag AND filter returns only expenses with all selected tags'.

## Scene 7 — Combined multi-field filter: AND across fields

Seed three expenses:
- 'Lunch food' — category 'food', date today.
- 'Lunch utilities' — category 'utilities', date today.
- 'Lunch old' — category 'food', date 2020-01-01.

Navigate to /expenses. Fill filter-description with 'Lunch', fill filter-from with '2024-01-01', choose category 'food' from filter-category. Click filter-submit.

Expect:
- 'Lunch food' visible (matches all three: description contains 'Lunch', date is on or after 2024-01-01, category is 'food').
- 'Lunch utilities' NOT visible (category is 'utilities', fails the category condition).
- 'Lunch old' NOT visible (date 2020-01-01 is before 2024-01-01, fails the from condition).

This demonstrates that all active filter fields are combined with AND. The OR/AND control only governs the tag-internal join, not the cross-field logic.

Verified by: e2e-tests/expenses/16-filter-combined-clear.spec.ts > 'combining description + from + category narrows results correctly'.

## Scene 8 — Clear filters: absent on first load; appears after filter; resets to unfiltered state

Sub-scene 8a — absent on first load: navigate to /expenses with no query string. Confirm filter-clear has count 0 (not rendered).

Sub-scene 8b — appears after filter: seed one expense. Navigate to /expenses. Fill filter-description 'Any' and click filter-submit. Expect filter-clear is now visible.

Sub-scene 8c — resets to unfiltered: seed two expenses — 'Visible expense' (today) and 'Old expense' (2020-01-01). Navigate to /expenses. Fill filter-from '2024-01-01', click filter-submit. Confirm 'Old expense' is not shown. Click filter-clear. Expect: URL is exactly http://localhost:3000/expenses (no query string). filter-description, filter-from, filter-to are all empty. filter-clear is NOT present. Both expenses are visible (default 2-month window reactivates on a clean first load).

Verified by: e2e-tests/expenses/16-filter-combined-clear.spec.ts > 'Clear filters link is absent on first load', 'Clear filters link appears after applying a description filter', 'Clear filters link navigates back to unfiltered page and removes filter inputs'.

## Scene 9 — No-match empty state and Clear recovery

Seed one expense: 'Real expense' (today). Navigate to /expenses. Fill filter-description with 'xyznonexistent' and click filter-submit.

Expect:
- expenses-empty-state is visible ('No expenses yet').
- expense-row is NOT present.
- filter-clear IS visible (an active filter is set even though it returned 0 results).

Click filter-clear. Expect: URL resets to /expenses; 'Real expense' is visible in expense-row-description; expenses-empty-state is NOT visible.

Verified by: e2e-tests/expenses/16-filter-combined-clear.spec.ts > 'empty filter submission shows empty-state when no matches' and 'Clear filters after no-result search shows expenses again'.

## Verification

Run the three Issue 11 Playwright specs to execute all 22 scenarios deterministically:

```
npx playwright test e2e-tests/expenses/14-filter-description-dates.spec.ts e2e-tests/expenses/15-filter-category-tags.spec.ts e2e-tests/expenses/16-filter-combined-clear.spec.ts
```

Each test uses testWithDatabase for per-test database isolation so all scenes can be executed in any order or repeated without manual cleanup.
