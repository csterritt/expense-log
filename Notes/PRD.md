# PRD: Expense Log

## Problem Statement

The current application is an authentication-only service with no business logic beyond sign-in, sign-up, and password reset. Users sign in and land on a placeholder `/private` page with nothing to do. There is no way to track spending, categorize transactions, or review financial history. The gap is a complete expense tracking feature that replaces the placeholder and gives authenticated users a functional application.

## Solution

After signing in, users land on an expense log page where they can enter new expenses and see recent spending. The app supports full CRUD for expenses, categories, and tags; text-based summaries; and automatic generation of recurring expenses via a nightly cron job. All data is shared across all authenticated users. Amounts are stored as integer cents in USD. Refunds are stored with positive amounts but subtract from totals and render with underlined fields. The default view shows the last three calendar months.

## User Stories

1. As a signed-in user, I want `/expenses` to be the landing page after sign-in, so that I can immediately start logging expenses.
2. As a signed-out user, I want to see a welcome page or be redirected to sign-in, so that I know I need to authenticate.
3. As a signed-in user, I want a single `/expenses` page with an entry form at the top and the expense list below, so that I can enter and review spending in one place.
4. As a signed-in user, I want the default list to show expenses from the last three calendar months, so that I focus on recent activity.
5. As a signed-in user, I want to enter an expense with description, amount (in dollars and cents), category, optional tags, and date, so that I can record what I spent.
6. As a signed-in user, I want the date to default to today, so that I don't have to type it for same-day entries.
7. As a signed-in user, I want to select a category from a searchable dropdown populated from existing categories, or type a new category name that gets created on the fly, so that I don't have to pre-plan categories.
8. As a signed-in user, I want to select zero or more tags from a searchable multi-select dropdown populated from existing tags, or type new tag names that get created on the fly, so that I can add context without pre-planning tags.
9. As a signed-in user, I want to mark an expense as a refund via an optional checkbox, so that it subtracts from running totals and is visually distinct.
10. As a signed-in user, I want refund expenses to display with underlined fields and a positive amount, so that they are clearly identifiable.
11. As a signed-in user, I want to edit any existing expense, so that I can correct mistakes.
12. As a signed-in user, I want to delete any existing expense, so that I can remove incorrect entries.
13. As a signed-in user, I want to search expenses by description text, so that I can find a specific purchase.
14. As a signed-in user, I want to filter the expense list by date range, so that I can review spending in a custom period.
15. As a signed-in user, I want to filter the expense list by category, so that I can see spending in one category.
16. As a signed-in user, I want to filter the expense list by one or more tags, so that I can see spending tagged with specific labels.
17. As a signed-in user, I want to see text summaries of total spending grouped by category, tags, or date, optionally filtered by date range, so that I can understand my spending patterns.
18. As a signed-in user, I want summaries to treat refunds as negative amounts in the totals, so that the math is correct.
19. As a signed-in user, I want to manage categories via CRUD on a separate page, so that I can organize my category list.
20. As a signed-in user, I want the system to block deletion of a category that is referenced by any expense, so that I don't accidentally lose data.
21. As a signed-in user, I want to manage tags via CRUD on a separate page, so that I can maintain my tag list.
22. As a signed-in user, I want the system to block deletion of a tag that is referenced by any expense, so that I don't accidentally lose data.
23. As a signed-in user, I want to create recurring expenses with the same fields as regular expenses plus a recurrence type (Monthly, Quarterly, Yearly), so that regular bills are automatically logged.
24. As a signed-in user, I want to see a list of all recurring expenses and be able to edit or delete them, so that I can manage my recurring entries.
25. As the system, I want to run a nightly cron job that checks recurring expenses and generates actual expense records on their scheduled date, so that users don't have to manually enter regular bills.
26. As the system, I want recurring monthly expenses scheduled for a day past the 28th to generate on the 28th instead, so that they occur in every month including February.
27. As the system, I want each recurring expense to generate at most once per period (month, quarter, or year), so that there are no duplicate entries.
28. As a signed-in user, I want future-dated expenses to be allowed, so that I can log upcoming expenses in advance.
29. As a signed-in user, I want all expenses, categories, and tags to be visible and editable by any authenticated user, so that we share a single expense log.
30. As a signed-in user, if I submit an expense form with missing required fields, I want validation errors to be displayed inline, so that I know what to fix.
31. As a signed-in user, when filtering expenses by multiple tags, I want a toggle to switch between "all selected tags must appear" and "any selected tag, but at least one, must appear", so that I can control the filter strictness.

## Implementation Decisions

- **Landing page**: `/expenses` replaces `/private` as the authenticated landing page. Signed-out users visiting `/expenses` are redirected to sign-in.
- **Page layout**: The `/expenses` page renders the creation form first, followed by the list of recent expenses. Search/filter controls sit above the list.
- **Currency**: USD only. Amounts are captured as dollar strings in the UI, parsed to integer cents for storage, and formatted back to dollars for display.
- **Data scope**: Expenses, categories, and tags are global tables with no user-scoping. All authenticated users share the same data set.
- **Refunds**: Stored with `isRefund = true` and a positive `amount`. Totals subtract refund amounts. UI renders refund rows with underlined text across all fields.
- **Category deletion**: Blocked at the database/handler level if any expense references the category. Same for tag deletion.
- **Recurring expense schedule**: Each recurring expense has a `baseDate` (timestamp) that anchors the schedule. Monthly recurs on that day each month (capped at 28). Quarterly recurs on that day every three months starting from the base month. Yearly recurs on that day in the base month each year.
- **Recurring generation**: A nightly cron trigger runs `processRecurringExpenses`. For each recurring expense, it calculates the next scheduled date for the current period. If today is on or after that date and no record was generated for this period yet, it inserts an expense. A `lastGeneratedAt` timestamp on the recurring record prevents duplicates.
- **Recurring tags**: When a recurring expense generates an actual expense, all associated tags are copied to the new expense via the junction table.
- **Summaries**: A separate `/summaries` page. Summaries are text-only tables. Group by category, tag, or date. Date grouping is by calendar month. Date range filter is optional; default is no filter (all time).
- **Tag filter mode**: When filtering by multiple tags, a UI toggle lets the user choose between "all" (AND logic) and "any" (OR logic). The default is "any". The query joins the `expenseTag` table with `HAVING COUNT(DISTINCT tagId) = N` for AND, or a simple `IN` clause for OR.
- **Searchable dropdowns**: Implemented with DaisyUI/Tailwind combobox-style selects. Category and tag creation on the fly means the POST handler for expenses accepts category name and tag names, creating missing entries before inserting the expense.
- **Schema additions**: New tables — `category`, `tag`, `expense`, `expenseTag`, `recurringExpense`, `recurringExpenseTag`. All use text UUID primary keys and integer timestamps for consistency with existing schema.

## Module Design

- **Expense Management**
  - **Responsibility**: CRUD for expenses, search, filtering, default three-month view.
  - **Interface**: `createExpense(data)`, `getExpenses(filters)`, `updateExpense(id, data)`, `deleteExpense(id)`. Filters include date range, category, tags, search text. Returns expense records with joined category and tags.
  - **Tested**: yes

- **Category Management**
  - **Responsibility**: CRUD for global categories; blocks deletion if referenced.
  - **Interface**: `createCategory(name)`, `getCategories()`, `updateCategory(id, name)`, `deleteCategory(id)`. `deleteCategory` returns a boolean or error indicating whether the category is in use.
  - **Tested**: yes

- **Tag Management**
  - **Responsibility**: CRUD for global tags; blocks deletion if referenced.
  - **Interface**: `createTag(name)`, `getTags()`, `updateTag(id, name)`, `deleteTag(id)`. Same blocking semantics as categories.
  - **Tested**: yes

- **Summary Generation**
  - **Responsibility**: Generate text summaries grouped by category, tag, or date, respecting the refund flag.
  - **Interface**: `getSummary(groupBy, dateRange?)`. `groupBy` is `'category' | 'tag' | 'date'`. Returns an array of `{ key, totalCents, count }` sorted by total descending. Refunds subtract from totals.
  - **Tested**: yes

- **Recurring Expense Management**
  - **Responsibility**: CRUD for recurring expense templates.
  - **Interface**: `createRecurringExpense(data)`, `getRecurringExpenses()`, `updateRecurringExpense(id, data)`, `deleteRecurringExpense(id)`. Data includes all expense fields plus `recurrence` and `baseDate`.
  - **Tested**: yes

- **Recurring Expense Processor**
  - **Responsibility**: Nightly generation of actual expenses from recurring templates.
  - **Interface**: `processRecurringExpenses(today)`. For each recurring expense, computes the scheduled date for the current period. If `today >= scheduledDate` and the record has not been generated for this period, inserts an expense with copied tags and updates `lastGeneratedAt`.
  - **Tested**: yes

- **Expense Page Renderer**
  - **Responsibility**: Build the combined form + list JSX page for `/expenses`.
  - **Interface**: Hono route builder that renders the form with searchable dropdowns and the filtered expense list. Not a pure function; depends on request context.
  - **Tested**: no (covered by E2E)

## Testing Decisions

- **Unit tests** for `Expense Management`, `Category Management`, `Tag Management`, `Summary Generation`, `Recurring Expense Management`, and `Recurring Expense Processor` modules. These modules encapsulate database logic and are testable with isolated D1 queries or in-memory mocks.
- **E2E tests** for the full user flows: creating an expense, searching/filtering, editing, deleting, category/tag CRUD, summary page, and recurring expense creation. Use existing Playwright patterns with database isolation.
- **Cron tests**: The `Recurring Expense Processor` should have unit tests that pass a mocked "today" date and verify correct generation and duplicate prevention. This mirrors the existing `time-access` clock-manipulation pattern.
- Prior art: `e2e-tests/` for Playwright page objects and form helpers; `tests/` for unit tests using `bun test`.

## Out of Scope

- Multi-currency support (USD only).
- Charts, graphs, or any visual data representation.
- Offline mode or local storage sync.
- Per-user expense isolation (all data is shared).
- Import/export of expenses from CSV or other formats.
- Budgeting, forecasting, or expense planning features.
- Push/email notifications for recurring expense generation.
- Recurring expense recurrence types beyond Monthly, Quarterly, and Yearly.
- Mobile-native app or PWA features.
- Audit trail or soft-deletion of expenses.

## Open Questions

- **Owner**: developer
  - **Question**: Should the `baseDate` for a recurring expense default to today at creation time, or should the user explicitly pick it?
  - **Suggested resolution**: Default to today; user can override. This aligns with the regular expense date defaulting to today.
  - Decision: Use the Suggested resolution.

- **Owner**: developer
  - **Question**: Should the `/summaries` page include a summary by date that is grouped by day, or only by calendar month?
  - **Suggested resolution**: Group by calendar month only; "date" summary means monthly aggregation. Daily granularity can be added later if needed.
  - Decision: Use the Suggested resolution.

- **Owner**: developer
  - **Question**: How should the cron endpoint be exposed in the Cloudflare Worker? As a separate cron handler or as a standard HTTP route triggered by a Cloudflare Cron Trigger?
  - **Suggested resolution**: Use a Cloudflare Cron Trigger bound to a standard HTTP route (e.g., `/api/cron/recurring`). This keeps the handler testable via HTTP and fits the existing Hono routing pattern.
  - Decision: Use the Suggested resolution.

## Further Notes

- The existing `signedInAccess` middleware should protect all new expense-related routes.
- The existing `buildPrivate` route can be removed or replaced; `/private` should redirect to `/expenses` to preserve any bookmarks.
- Searchable dropdowns for category and tag can reuse the existing DaisyUI `select` styling with a small JavaScript-enhanced filter script, or be rendered server-side with a datalist if simplicity is preferred. Given the requirement for "searchable" and "create new on the fly", a small inline script in the page that filters options and allows free-text submission is acceptable.
- Recurring expense amounts and refund flags are copied to generated expenses. The generated expense date is set to the scheduled date, not the cron run date.
- For the capping rule: the scheduled day is computed as `min(originalDay, 28)` for monthly recurrence only. Quarterly and yearly use the actual day from `baseDate`, except February 29 in non-leap years falls back to February 28, and a Quarterly capping rule falls back to the last day of the quarter.
