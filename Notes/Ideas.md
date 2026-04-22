## Expense Log

The main ideas here are:

- We want to track our spending.
- We do NOT want to plan our expenses in advance.
- We want to log our expenses as we make them.
- We want to categorize our expenses.
- We want to tag expenses for additional context.
- We want to be able to search for expenses by description, category, or tag.
- We want to be able to filter expenses by date range.
- When filtering by one or more tags, we want a switch between "All tags must appear" (AND) and "Any tag, but at least one" (OR).
- We want to see the most recent expenses for the last three calendar months.
- We want to be able to see summaries of our expenses by category, tag, or date, optionally filtered by date range.
- We want to be able to enter expenses manually:
  - Description - required
  - Amount - required
  - Category - required
  - Tags - optional
  - Date - required (defaults to today)
- We want to be able to choose a category or a tag from a drop-down list, or enter a new one if it doesn't exist.
- The drop-down lists should be populated from existing categories and tags.
- The drop-down lists should be searchable.
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
