## Expenses web app

### Goals

- Track expenses
- Categorize expenses
- Summarize expenses

### Users

- You have to be signed in to use the app
- You can have multiple users, all expenses are shared
- All users see all the expenses

### App architecture

- Hono web server
- SQLite database
- Simple HTML/CSS frontend
- DaisyUI components with Tailwind CSS for styling

### Database architecture

- Users, accounts, etc.
- Expense
  - User entering
  - Amount (all USD)
  - Date (default today)
  - Description
  - Category?
  - Tags?
  - Recurring (weekly, monthly, multi-month?)

### Display

- Form entry for new expense above history
- History
  - Sort by date descending, but can change sort
  - Different background for each month
  - Search for category/tag
  - Filter by category/tag or description search
- Summary
  - Select by category(ies)/tag(s)
  - Sort by category/tag
