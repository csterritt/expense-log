## Expense Log

The main ideas here are:

- We want to track our spending.
- We do NOT want to plan our expenses in advance.
- We want to log our expenses as we make them.
- We want to categorize our expenses.
- We want to tag expenses for additional context.
- Categories and Tags are single words, with no whitespace, which can contain ONLY ASCII letters, numbers, hyphens, and underscores. Duplicates are not allowed, and all values are stored and shown in lowercase.
- We want to be able to search for expenses by description, category, or tag.
- We want to be able to filter expenses by date range.
- When filtering by one or more tags, we want a switch between "All tags must appear" (AND) and "Any tag, but at least one" (OR).
- We want to see the most recent expenses for the last three calendar months. Default range is current calendar month plus two preceding calendar months, inclusive, from the first day of the month two months before today through today in ET.
- We want to be able to enter expenses manually:
  - Description - required
  - Amount - required
  - Category - required
  - Tags - optional
  - Date - required (defaults to today)
- We want to be able to choose a category from a drop-down list, or enter a new one if it doesn't exist.
- We want to be able to choose a tag from a block of checkboxes shown as chips, or enter a new one if it doesn't exist.
- The category drop-down lists/tag blocks should be populated from existing categories and tags.
- The category drop-down list should be searchable.
- We want full CRUD for expenses, categories, and tags.
- This is a web app that runs in the browser.
- It does not need to be able to run offline.
- You have to sign in to use the app.
- You can see all expenses and manage them, as well as all categories and tags.
- Uses the existing auth system.
- Uses the existing database system.
- Uses the existing email system.
- Uses tailwindcss and daisyui for styling.
- Recurring expenses: Have all the same fields as regular expenses, but also have a recurrence parameter, which is one of:
  - Monthly
  - Quarterly
  - Yearly
- Recurring expenses will be auto-inserted into the database on their recurrence date, so that (for example) a recurring expense incurred on the 5th of the month will be added automatically to the expenses database table, but only once for the month, on or after that date.
- There should be a 'cron' type process to run nightly.
- For days past the 28th, recurring expenses should be accounted for on the 28th, so that they occur in every month.
- We want to be able to see summaries of our expenses by category, tag, or date, filtered by date range.
  - A summary is the sum of all expenses that match the filter criteria, grouped by a time period (month, quarter, year).
  - You can either summarize by time period, category, tag, or category plus one or more tags.
  - By default, the summary is grouped by month.
  - By default, the summary is done by category.
  - By default, no tags are selected.
  - The user can select one or more tags to include in the summary.
    - If no tags are selected, all tags are included in the summary.
    - If multiple tags are selected, the summary is AND logic (all tags must be present).
  - The user can select the grouping period (month, quarter, year).
  - The summary should be displayed in a table with the following columns:
    - Category name
    - Grouping period (month, quarter, year)
    - Count of expenses
    - Total amount
- For both entering new expenses and for the summarization page, the existing tags should be shown as a block of checkboxes shown as chips, with (on expense entry or expense edit) the ability to add new tags.
  - The chips should be sorted alphabetically.
  - The chips should be clickable to select/deselect them.
  - The chips should be displayed in a row, wrapping to the current viewport width.
- For the summary page, the months and quarters should be sorted chronologically, and not alphabetically.
- For both individual Months and Quarters, the year should be added at the end of the label after the month or quarter, e.g. "March 2025".
  - They still should sort chronologically, not alphabetically.
  - This allows proper grouping, in that I don't want data from March 2025 to be grouped with March 2026.
- Since this is a multi-user database, we need to address what happens when (for example) two people submit the same category or tag simultaneously.
  - There should be a database constraint to ensure that the category or tag is only created once.
  - The user should not see an error, but should see the existing category or tag selected.
- User submitted data should never be trusted, but validated and sanitized. Browsers can be tricked, and we don't want to be vulnerable to attacks.

Example data:

| description     | date       | amount | category | tags             |
| --------------- | ---------- | ------ | -------- | ---------------- |
| Breakfast       | 03/21/2026 | 20.00  | food     | diane,restaurant |
| brunch          | 04/21/2026 | 40.00  | food     | diane,fast-food  |
| Gift for Kaylee | 05/21/2026 | 400.00 | gift     | lego,diane       |
| Gift for Joshua | 04/21/2026 | 300.00 | gift     | chris,game       |
| dinner          | 05/21/2026 | 50.00  | food     | chris,restaurant |
| Gift for Jenna  | 03/21/2026 | 200.00 | gift     | diane,game       |
| snack           | 03/21/2026 | 10.00  | food     | chris,fast-food  |
| lunch           | 04/21/2026 | 30.00  | food     | chris,restaurant |
| Gift for Tim    | 05/21/2026 | 100.00 | gift     | chris,lego       |

For example, if we summarize by category and month, we would get a table like this:

| category | month | count | total  |
| -------- | ----- | ----- | ------ |
| food     | 03    | 2     | 30.00  |
| food     | 04    | 2     | 70.00  |
| food     | 05    | 1     | 50.00  |
| gift     | 03    | 1     | 200.00 |
| gift     | 04    | 1     | 300.00 |
| gift     | 05    | 3     | 500.00 |

If we asked to summarize by category and year, we would get a table like this:

| category | year | count | total   |
| -------- | ---- | ----- | ------- |
| food     | 2026 | 5     | 150.00  |
| gift     | 2026 | 4     | 1000.00 |

If we asked to summarize by month, we would get a table like this:

| month | count | total  |
| ----- | ----- | ------ |
| 03    | 3     | 230.00 |
| 04    | 3     | 370.00 |
| 05    | 3     | 550.00 |

If we asked to summarize by tag and quarter, we would get a table like this:

| tag        | quarter | count | total  |
| ---------- | ------- | ----- | ------ |
| diane      | jan-mar | 2     | 220.00 |
| diane      | apr-jun | 1     | 40.00  |
| chris      | jan-mar | 1     | 10.00  |
| chris      | apr-jun | 2     | 480.00 |
| restaurant | jan-mar | 1     | 20.00  |
| restaurant | apr-jun | 2     | 80.00  |
| fast-food  | jan-mar | 1     | 10.00  |
| fast-food  | apr-jun | 1     | 40.00  |
| game       | jan-mar | 1     | 200.00 |
| game       | apr-jun | 1     | 300.00 |
| lego       | apr-jun | 2     | 500.00 |

If we asked to summarize by category, month, and restaurant tag, we would get a table like this:

| category | tag        | month | count | total |
| -------- | ---------- | ----- | ----- | ----- |
| food     | restaurant | 03    | 1     | 20.00 |
| food     | restaurant | 04    | 1     | 40.00 |
| food     | restaurant | 05    | 1     | 50.00 |
