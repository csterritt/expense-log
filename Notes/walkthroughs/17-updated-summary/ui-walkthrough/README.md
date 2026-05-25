# Issue 17 Updated Summary — UI Walkthrough

*2026-05-26T01:40:13Z by Showboat 0.6.1*
<!-- showboat-id: a34de4d6-05e1-4308-98fa-d01c4279d8ae -->

This walkthrough demonstrates the user-facing flows added by Issue 17 for the /summary page.

The summary page allows users to view aggregated expense data grouped by four dimensions (time, category, tag, category-tag) with three time granularities (month, quarter, year), optional tag-AND filtering, and sortable columns.

Flow 1: Default first load

When a signed-in user first visits /summary with no query parameters:

- Dimension selector defaults to 'Category'

- Granularity selector defaults to 'Month' and is always visible

- Date range inputs are empty (no date filter applied by default)

- The summary table shows aggregated rows grouped by category and month: Category | Month | Count | Total

- No grand total row is displayed

Flow 2: Switching to time dimension

User changes the Dimension selector from 'Category' to 'Time' and clicks Apply:

- The page reloads with time-only aggregation

- Table columns change to: Time Period | Count | Total

- No category or tag columns appear

Flow 3: Switching to tag dimension

User changes the Dimension selector to 'Tag' and clicks Apply:

- Table shows: Tag | Time Period | Count | Total

- Expenses with multiple tags appear in multiple rows (one per tag) — double-counting is intentional for tag analysis

- Expenses with zero tags are excluded from this dimension

Flow 4: Switching to category-tag dimension

User changes the Dimension selector to 'Category + Tag' and clicks Apply:

- Table shows: Category | Tag | Time Period | Count | Total

- Zero-tag expenses are excluded

- Multi-tagged expenses split into separate category+tag rows

Flow 5: Switching granularity

User changes the Granularity selector from 'Month' to 'Quarter' and clicks Apply:

- Time Period labels change from 'Mmm' (e.g. 'Jan') to 'Mmm-Mmm' (e.g. 'Jan-Mar')

User changes to 'Year' and clicks Apply:

- Time Period labels change to 'YYYY' (e.g. '2024')

- Expenses across multiple months/quarters collapse into their year buckets

Flow 6: Sorting columns

User clicks a column header (e.g. 'Total'):

- First click sorts descending; URL gains sort=totalCents:desc

- Second click sorts ascending; URL changes to sort=totalCents:asc

- Sort state persists across page reloads via the query string

Flow 7: Tag-AND filtering

When tags exist, a note explains that selecting multiple tags filters to expenses carrying ALL selected tags (AND semantics).

User selects one tag checkbox and clicks Apply:

- Table includes only expenses carrying that tag

User selects two tag checkboxes and clicks Apply:

- Table narrows to only expenses carrying both selected tags

User selects three tags that no single expense carries:

- Empty state message appears

Flow 8: Clear filters

User clicks the 'Clear' link (visible when filters are applied):

- Navigates to /summary with no query parameters

- All filter inputs reset to defaults: Category dimension, Month granularity, empty date range, no tags selected

Flow 9: Empty state

When filters result in no matching expenses:

- The table is hidden

- An empty-state message appears: 'No expenses match the selected filters.'

Flow 10: Recurring expense participation

Recurring templates do not appear in the summary until they have been materialized into actual expense rows by the cron job.

- A recurring template without materialized rows in the date range contributes nothing to the summary

- A materialized recurring row counts exactly like a manually created expense in its time period, category, and tag groupings
