# Issue 12 Summary Page — UI Walkthrough

*2026-05-07T00:12:23Z by Showboat 0.6.1*
<!-- showboat-id: 9cc8cf08-7eeb-447e-ab8d-a7821d128fbf -->

This walkthrough demonstrates the user-facing flows added by Issue 12 for the /summary page.

The summary page allows users to view aggregated expense data grouped by date (month or year), with optional filtering by category and tags.

Flow 1: Default first load

- The page loads with the default 2-month ET date window

When a signed-in user first visits /summary with no query parameters:

- Group-by selector defaults to 'Month'

- Category dropdown shows 'All' plus all seeded categories

- Tag checkboxes appear when tags exist (with Any/All mode radios)

- The summary table shows aggregated rows grouped by month, category, and tag

- Grand total row at the footer shows the sum of all displayed rows

Flow 2: Switching to year grouping

- Category column shows the selected category name

User changes the Group-by selector from 'Month' to 'Year' and clicks Apply:

- The page reloads with year-level aggregation

- Date column shows YYYY instead of YYYY-MM

- Expenses across multiple months are collapsed into their year buckets

- Totals and counts are recalculated for the year grouping

Flow 3: Applying a date-range filter

User sets From and To date inputs to narrow the time window:

- Only expenses within the specified date range are included in aggregation

- The table updates to show only matching rows

- Grand total reflects the filtered subset

Flow 4: Category filter

User selects a specific category from the dropdown and clicks Apply:

- Only expenses in the selected category are aggregated

Flow 5: Tag filter

User clicks one or more tag checkboxes and selects 'Any tag' or 'All tags' mode:

- 'All tags' mode: only expenses with ALL selected tags are included

- Tag column shows the tag names for each row

- 'Any tag' mode: expenses with at least one selected tag are included

- Expenses with multiple tags appear in multiple rows (one per tag)

Flow 6: Empty state

When filters result in no matching expenses:

- The table is hidden

- An empty-state message appears: 'No expenses match the selected filters.'

Flow 7: Clear filters

- Returns to the default first-load state with the 2-month ET window

User clicks the 'Clear filters' link (visible when filters are applied):

- This also occurs when no expenses exist at all in the database

- Navigates to /summary with no query parameters

- All filter inputs are reset to their default values
