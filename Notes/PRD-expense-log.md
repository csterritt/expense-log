# PRD: Expense Log

## Problem Statement

Signed-in users of the app need a simple way to record spending as it happens and to make sense of it later. Today the app only provides authentication — there is no way to capture an expense, organize it with categories or tags, or look back at what has been spent. Users want to log expenses in the moment, not plan them in advance, and then search, filter, and summarize that history to understand where their money is going.

## Solution

When the feature is complete, any signed-in user can:

- Log an expense in a few seconds from a form that sits at the top of the default landing page.
- Pick a category from a searchable dropdown (or create one inline) and attach zero or more tags via a chip picker (creating new tags inline).
- See the most recent expenses — everything in the current calendar month and the two preceding months — in a single scrollable list, newest first.
- Search that list by description and filter it by an arbitrary date range, by category, and by one or more tags (with an AND/OR toggle for tags).
- View summaries grouped by category, tag, or date (month or year granularity) on a dedicated page, with an optional date-range filter.
- Edit or delete any expense, category, or tag — subject to referential-integrity guards.
- Define **recurring expenses** (monthly, quarterly, yearly) that auto-materialize into the expense list on their schedule via a nightly cron, without the user having to re-enter them.

All data is shared across all signed-in users: everyone sees everyone else's expenses, categories, tags, and recurring templates. The feature reuses the existing auth, database, email, and styling (Tailwind + DaisyUI) systems. It is US-English, USD-only, and all date logic is anchored to `America/New_York`.

## User Stories

### Entry

1. As a signed-in user, I want to see an expense-entry form at the top of the default landing page, so that I can log a spend without navigating anywhere.
2. As a signed-in user, I want the date field to default to today (in ET), so that logging current spending requires no extra input.
3. As a signed-in user, I want the description to be a required free-text field up to 200 characters, so that I can describe what the expense was.
4. As a signed-in user, I want the amount field to accept `1234.56`, `1,234.56`, `1234`, `.50`, and similar forms, so that I can type naturally; the system strips commas and validates up to two decimal places, with the value strictly greater than zero.
5. As a signed-in user, I want to select a category from a searchable dropdown, so that I can find existing categories quickly.
6. As a signed-in user, I want to type a brand-new category name in the dropdown and be asked "Create category 'foo'?" on submit, so that I can create a category without leaving the form.
7. As a signed-in user, I want to add tags one at a time from a searchable picker that accumulates selected tags as chips, so that I can attach multiple tags without re-typing.
8. As a signed-in user, I want to remove a tag chip by clicking its × control, so that I can correct mistakes before submitting.
9. As a signed-in user, I want duplicate tag selections to be silently ignored, so that a tag appears at most once on an expense.
10. As a signed-in user, I want to type a brand-new tag name in the tag picker and be asked "Create tag 'foo'?" on submit, so that I can create tags without leaving the form.
11. As a signed-in user, when my submission contains multiple new categories or tags, I want a single confirmation page listing every new name and the full expense data, so that I can review all creations at once.
12. As a signed-in user, if I cancel the confirmation, I want to return to the form with all my values preserved, so that I do not lose work.
13. As a signed-in user, after a successful submit I want the page to redirect back to the list with a cleared form and the new row visible, so that I can log the next expense fresh.
14. As a signed-in user with JavaScript disabled, I want the category and tag inputs to still work as plain text fields that flow through the same confirmation step, so that I can still use the app.

### Validation failures

15. As a signed-in user, if description is empty or exceeds 200 characters, I want a clear field-level error, so that I can fix it.
16. As a signed-in user, if amount is missing, non-numeric, zero, negative, has more than two decimal places, or has malformed commas after normalization, I want a clear field-level error.
17. As a signed-in user, if category is missing after the dropdown flow, I want a clear field-level error.
18. As a signed-in user, if a tag or category name I'm creating exceeds 20 characters or is empty after trimming, I want a clear error.
19. As a signed-in user, if date is missing or not a valid calendar date, I want a clear field-level error.
20. As a signed-in user, when the form re-renders after a validation error, I want all my other values — including selected tag chips — preserved.

### List (default page)

21. As a signed-in user, I want the default landing page after sign-in to show the entry form at top and a list below of all expenses whose date falls in the current calendar month plus the two preceding calendar months (ET), so that I see what's recent without filtering.
22. As a signed-in user, I want the list sorted by date descending, ties broken by description ascending (case-insensitive), so that ordering is predictable.
23. As a signed-in user, I want all matching rows rendered on one page with no pagination, so that I can scroll or use Ctrl-F across the full view.
24. As a signed-in user, if there are no matching expenses, I want an empty-state message under the form, so that the page doesn't look broken.
25. As a signed-in user, I want each row to show date, description, category, tags, and formatted amount (e.g. `$1,234.56`), so that I can read expenses at a glance.
26. As a signed-in user, I want each row to have a single "Edit" button that takes me to an edit page, so that modification is one click away.

### Search and filter

27. As a signed-in user, I want a single search input that matches a case-insensitive substring against the description, so that I can narrow the list by what the expense was for.
28. As a signed-in user, I want a date-range filter with "from" and "to" fields, each independently optional (open-ended ranges allowed), so that I can look at any window.
29. As a signed-in user, I want the date-range default — on first load of the filter UI — to be "from the first of the month three months ago" "to today", matching the default list view.
30. As a signed-in user, I want a category filter that picks zero or one category, so that I can narrow by a single category.
31. As a signed-in user, I want a tag filter that picks zero or more tags plus an AND/OR toggle ("all tags must appear" vs "any tag, at least one"), so that I can intersect or union across tags.
32. As a signed-in user, I want search, date-range, category, and tag filters to combine with AND semantics across fields (tag-internal semantics governed by the toggle), so that I can progressively narrow results.
33. As a signed-in user, I want to clear all filters with one control, so that I can return to the default view.

### Summaries

34. As a signed-in user, I want a dedicated Summary page with a single grouping selector (Category / Tag / Date), so that I can switch views in place.
35. As a signed-in user, I want the summary table to show group name, count of expenses, total amount, and percent of overall total, so that I can compare groups.
36. As a signed-in user, I want the table sorted by total amount descending by default, so that the biggest groups are at the top.
37. As a signed-in user, I want a date-range filter on the summary page with the same default and open-ended behavior as the list filter, so that filtering behaves consistently.
38. As a signed-in user, when grouping "By Date", I want a granularity selector (Month / Year), so that I can zoom in or out.
39. As a signed-in user, I want the default grouping on first visit to be "Category", so that I see the most common view by default.
40. As a signed-in user, when an expense has multiple tags and the grouping is "By Tag", I want its amount counted in full under each of its tags, so that each tag's total reflects everything tagged with it. (Percent-of-total on this view is relative to the sum of tagged-row totals, which can exceed 100%.)
41. As a signed-in user, if the filtered result set is empty, I want an empty-state message instead of a table.

### Management: categories

42. As a signed-in user, I want a Categories page that lists all categories alphabetically, so that I can manage them.
43. As a signed-in user, I want to create a new category from that page with a single-field form, so that I can set up categories in advance if I want.
44. As a signed-in user, I want to rename a category from that page; the name is normalized to lowercase.
45. As a signed-in user, if I rename a category to a name that already exists, I want to be shown a confirmation that the two will be merged (all expenses reassigned to the target, source deleted), so that I can choose to proceed or cancel.
46. As a signed-in user, I want to delete a category only when no expense references it; if any do, I want the delete blocked with a message telling me how many expenses reference it.
47. As a signed-in user, I want category-name uniqueness to be enforced case-insensitively at create time.

### Management: tags

48. As a signed-in user, I want a Tags page that lists all tags alphabetically, so that I can manage them.
49. As a signed-in user, I want to create, rename, and delete tags with the same rules as categories (lowercase normalization, case-insensitive uniqueness, merge-on-rename-collision, delete blocked if referenced).
50. As a signed-in user, when a tag delete is blocked, I want the error to tell me how many expenses reference it.

### Edit / delete expense

51. As a signed-in user, I want the edit page to show all expense fields pre-populated via `value` attributes, so that I can modify any of them.
52. As a signed-in user, I want the edit page to use the same validation rules and inline-create flows as the entry form, so that editing behaves consistently.
53. As a signed-in user, I want a "Delete" button on the edit page that takes me to a confirmation page showing the expense I'm about to delete, so that I don't delete by accident.
54. As a signed-in user, after confirming delete or saving an edit, I want to be redirected back to the list, so that I can continue work.

### Navigation and access

55. As an unauthenticated visitor, I want every expense, category, tag, summary, and recurring route to redirect me to sign-in, so that data is never exposed publicly.
56. As a signed-in user, I want the main layout header to include links to "Expenses" (list), "Categories", "Tags", "Summary", and "Recurring", so that I can navigate the feature.

### Recurring expenses

57. As a signed-in user, I want a Recurring page (linked from the header) that lists all recurring templates with their description, amount, category, tags, recurrence, anchor date, and next scheduled occurrence date, so that I can see what's on schedule.
58. As a signed-in user, I want to create a recurring template with the same fields as an expense (description, amount, category, tags) plus `recurrence` ∈ {Monthly, Quarterly, Yearly} and an `anchorDate`, using the same inline-create flows for category and tags, so that recurring setup feels identical to expense entry.
59. As a signed-in user, I want recurring templates to run forever until I delete them, so that I don't have to re-enable them.
60. As a signed-in user, I want a template I create today to begin generating on its **next** scheduled occurrence after today, never the current period (even if today is past the anchor day), so that creation never retroactively inserts a row.
61. As a signed-in user, I want Monthly templates to fire on the anchor's day-of-month every month, shifting to the 28th for any month where the anchor day is 29, 30, or 31, so that every month produces exactly one occurrence.
62. As a signed-in user, I want Quarterly templates to fire every 3 months starting from the anchor (same day-of-month), with the same 28th-shift rule, so that quarterly timing tracks the anchor.
63. As a signed-in user, I want Yearly templates to fire once per year on the anchor's month and day, with the same 28th-shift rule (so anchor Feb 29 fires Feb 28 every non-leap year, and anchor May 31 fires May 28 every year), so that yearly timing is unambiguous.
64. As a signed-in user, I want to edit any field of a recurring template; my edits apply only to **future** occurrences and leave past generated rows unchanged, so that historical totals stay accurate.
65. As a signed-in user, I want to delete a recurring template; past generated rows remain in the list (with the link back cleared), so that history is preserved.
66. As a signed-in user, I want generated expense rows to appear in the normal list alongside manual ones, visually marked with an underlined description and a small badge (e.g. `↻`), so that I can tell them apart at a glance.
67. As a signed-in user, I want to edit or delete any generated expense row independently of its template (the provenance link is preserved on edit), so that I can correct a specific month's amount without touching the template.
68. As a signed-in user, I want generated expenses counted identically to manual ones in search, filter, and summaries, so that reports reflect total spending.
69. As a signed-in user, I want the cron to never double-insert an occurrence — even if it runs twice on the same day or catches up after an outage — so that my data stays clean.
70. As a signed-in user, if the cron has missed days (outage, deployment gap), I want the next run to generate every missed occurrence up to today, but never earlier than the template's creation date, so that nothing is silently skipped.
71. As a signed-in user, if cron execution fails, I want a Pushover notification sent (when configured) and the error logged, so that I find out quickly.
72. As a signed-in user, I want the same validation rules on the recurring-template form as on the expense form (description ≤ 200, amount > 0 with ≤ 2 decimals, category required, tag/category names ≤ 20 chars, anchor date must be a valid `YYYY-MM-DD`), so that templates can't produce invalid expenses.

## Implementation Decisions

### Data model (new tables)

- **`category`**: `id` (ULID, PK), `name` (text, stored lowercase, unique case-insensitive), `createdAt`, `updatedAt`.
- **`tag`**: `id` (ULID, PK), `name` (text, stored lowercase, unique case-insensitive), `createdAt`, `updatedAt`.
- **`expense`**: `id` (ULID, PK), `description` (text, ≤ 200 chars), `amountCents` (integer, > 0), `categoryId` (FK → `category.id`, `ON DELETE RESTRICT`), `date` (text, `YYYY-MM-DD`), `recurringId` (nullable FK → `recurring.id`, `ON DELETE SET NULL`), `occurrenceDate` (nullable text `YYYY-MM-DD`, the scheduled occurrence date before any user edit of `date`), `createdAt`, `updatedAt`.
- **`expenseTag`**: join table, `expenseId` (FK → `expense.id`, `ON DELETE CASCADE`), `tagId` (FK → `tag.id`, `ON DELETE RESTRICT`), PK `(expenseId, tagId)`.
- **`recurring`**: `id` (ULID, PK), `description` (text, ≤ 200 chars), `amountCents` (integer, > 0), `categoryId` (FK → `category.id`, `ON DELETE RESTRICT`), `recurrence` (text, one of `'monthly' | 'quarterly' | 'yearly'`), `anchorDate` (text, `YYYY-MM-DD`), `createdAt`, `updatedAt`.
- **`recurringTag`**: join table for a recurring template's tags, `recurringId` (FK → `recurring.id`, `ON DELETE CASCADE`), `tagId` (FK → `tag.id`, `ON DELETE RESTRICT`), PK `(recurringId, tagId)`.
- **Dedupe constraint**: unique index on `expense(recurringId, occurrenceDate)` where `recurringId IS NOT NULL`, guaranteeing the cron can never double-insert.

All schema changes are made in `src/db/schema.ts` and accompanied by a Drizzle migration.

### Money

- Stored as integer cents, no maximum.
- Input parsing: trim, strip commas, require match against a lenient regex (positive decimal with ≤ 2 decimal places), reject zero and negative.
- Display formatting: `$` prefix, comma thousands separators, always 2 decimal places.

### Dates and timezone

- All "today" / month-boundary logic anchored to `America/New_York` (DST-aware).
- Expense dates stored as `YYYY-MM-DD` strings.
- Default list window is `[first day of month (today - 2 months), today]` inclusive, computed in ET.

### Category/tag semantics

- Names normalized to lowercase on input; display lowercase.
- Uniqueness enforced case-insensitively at the DB level via a unique index on the stored (already-lowercase) `name`.
- Inline creation from the expense form is confirmed via a single consolidated confirmation page that lists every new category/tag to be created alongside the expense fields; confirm creates atomically in one transaction, cancel re-renders the form with all values preserved.
- Renaming to an existing name triggers a merge confirmation; on confirm, all references are repointed to the target and the source row is deleted in one transaction.
- Deleting is blocked when any expense references the row (FK `RESTRICT`); UI surfaces the reference count.

### Search and filter

- Search: case-insensitive `LIKE` on `description`.
- Date range: optional `from` / `to`, inclusive, compared as `YYYY-MM-DD` strings.
- Category filter: zero or one category id.
- Tag filter: zero or more tag ids with an AND/OR mode:
  - OR: expense has at least one of the selected tags.
  - AND: expense has all of the selected tags.
- All field-level filters AND-combined; tag-internal semantics governed by the toggle.

### Summaries

- Grouping selector: Category / Tag / Date.
- Date grouping has a granularity selector (Month / Year).
- Optional date-range filter with the same default as the list.
- Columns: group name, count, total amount, percent of overall total.
- Default grouping: Category. Default sort: total amount descending.
- By-Tag double-counts multi-tagged expenses per tag (documented in-UI via a short note).

### Forms and validation

- All form validation via valibot schemas in a dedicated module.
- Client-side validation via HTML attributes (`required`, `maxlength`, `pattern`, `min`).
- Form inputs use `value` (not `defaultValue`) for pre-population on edit and on re-render after validation errors.
- Post-redirect-get on successful create/update/delete.

### Client JS (progressive enhancement)

- Add a small vanilla-JS bundle served as a static asset that enhances:
  - **Category combobox**: `<input list>` + custom dropdown listing existing categories filtered by typed text, with a "Create 'foo'" affordance; falls back to a plain text input when JS is off.
  - **Tag chip picker**: searchable list of existing tags, selection accumulates chips with × remove buttons; a hidden input carries the JSON/CSV of selected tag names; falls back to a comma-separated text input when JS is off.
- Without JS, both inputs still submit names; the server-side confirmation page handles unknown-name creation identically for both paths.

### Auth and multi-user

- All new routes are gated by the existing signed-in middleware (same pattern as `buildPrivate`).
- No per-user ownership: every signed-in user sees and can mutate every expense, category, and tag.
- No createdBy / updatedBy audit fields.

### Navigation

- Update `src/routes/build-layout.tsx` to add header links: Expenses (list, which is `/expenses`), Categories, Tags, Summary, Recurring.

### Recurring expenses and the cron

- **Occurrence-date algorithm** (pure function of `recurrence`, `anchorDate`, reference `now` in ET, and an optional `sinceExclusive` date):
  - Monthly: the candidate day-of-month is `min(anchor.day, 28)` if `anchor.day > 28`, else `anchor.day`. Enumerate one candidate per month starting from the month after `sinceExclusive` (or the month of `anchorDate` if later).
  - Quarterly: same day-of-month rule; enumerate every 3 months from `anchorDate`.
  - Yearly: candidate `month/day` is `anchor.month/min(anchor.day, 28 if anchor.day > 28 else anchor.day)`. Enumerate once per year.
- **First-occurrence rule**: for a newly created template, the first generated occurrence is the first candidate strictly **after** the template's creation date (ET). Creating a Monthly template today with anchor day 5 never retroactively creates this month's row.
- **Catch-up rule**: on each cron run, for every template, generate one `expense` row per candidate occurrence date in the half-open range `(lastGeneratedOccurrenceDate, todayEt]`, bounded below by the template's creation date per the first-occurrence rule. First run after creation uses the first-occurrence rule as the lower bound.
- **Materialized expense fields**: `description`, `amountCents`, `categoryId`, and tag set are **copied from the template as of the moment of generation**. `expense.date` is set to the shifted occurrence date; `expense.occurrenceDate` records the same value for dedupe. Later edits to the template do not rewrite already-generated rows.
- **Edit-on-generated-row**: the user may freely edit or delete any generated `expense`. The `recurringId` / `occurrenceDate` fields are preserved on edit (provenance retained). The dedupe index keeps the cron idempotent regardless.
- **Template delete**: sets `recurringId` to `NULL` on every past generated row (`ON DELETE SET NULL`); those rows remain visible and editable as ordinary expenses.
- **Cron trigger**: Cloudflare Workers scheduled trigger at `0 5 * * *` UTC (05:00 UTC year-round), wired via `wrangler.jsonc` `triggers.crons` and a `scheduled(event, env, ctx)` export alongside the existing `fetch` export in `src/index.ts`. The handler calls the recurring materialization module and swallows per-template errors (continuing with the rest) while aggregating failures.
- **Failure reporting**: on any caught error, log via the existing `hono/logger` sink and, if `PO_APP_ID` / `PO_USER_ID` are set, send a Pushover notification via the existing `src/lib/po-notify.ts`.
- **Idempotency**: guaranteed by the unique index on `(recurringId, occurrenceDate)`; the materialization code catches unique-constraint errors and treats them as no-ops.
- **Dev-only manual trigger route**: a `POST /test/run-cron` route under `isTestRouteEnabledFlag` guards (marked with `// PRODUCTION:REMOVE`) invokes the same materialization function used by the scheduled handler. Used by Playwright to deterministically exercise cron behavior, including catch-up and the 28th-shift rule (combined with the existing `/test/set-clock` hook).
- **List rendering of generated rows**: rows with a non-null `recurringId` render with their description underlined and a small `↻` badge next to the description. They participate in search, filter, and summary identically to manual rows.
- **Recurring page**: `/recurring` shows all templates sorted by description (asc), each row showing description, formatted amount, category, tags, recurrence (capitalized), anchor date, and the computed next occurrence date (via the occurrence-date module). Each row has an Edit button leading to an edit page with a Delete button; delete goes to a confirmation page.

### Out-of-scope integrations

- Email system: unchanged — no expense-related emails are sent.
- Pushover: unchanged.

## Module Design

- **`money` module**
  - **Name**: `src/lib/money.ts`
  - **Responsibility**: Parse user-entered amount strings into integer cents and format integer cents back into display strings.
  - **Interface**:
    - `parseAmount(input: string): Result<number, AmountError>` — returns cents or a tagged error.
    - `formatCents(cents: number): string` — returns e.g. `$1,234.56`.
  - **Tested**: yes

- **`et-date` module**
  - **Name**: `src/lib/et-date.ts`
  - **Responsibility**: All date arithmetic and formatting in `America/New_York`.
  - **Interface**:
    - `todayEt(): string` — `YYYY-MM-DD`.
    - `defaultRangeEt(): { from: string; to: string }` — first of (today − 2 months) through today.
    - `monthKeyEt(ymd: string): string`, `yearKeyEt(ymd: string): string` — for date-grouped summaries.
    - `isValidYmd(s: string): boolean`.
  - **Tested**: yes

- **`recurrence` module**
  - **Name**: `src/lib/recurrence.ts`
  - **Responsibility**: Pure occurrence-date arithmetic for recurring templates. Given a template's `recurrence`, `anchorDate`, `createdAt`, a `lastOccurrence` (or none), and a reference `today` (ET), produce the ordered list of occurrence dates to generate. Encapsulates the 28th-shift rule and the first-occurrence rule. No DB or time-of-day coupling.
  - **Interface**:
    - `occurrencesToGenerate(input: { recurrence; anchorDate; createdAt; lastOccurrence?; today }): string[]`
    - `nextOccurrenceAfter(input: { recurrence; anchorDate; after }): string`
  - **Tested**: yes (exhaustive tables covering Feb 29/30/31 anchors, DST transitions, catch-up ranges, first-occurrence rule)

- **`expense-validators` module**
  - **Name**: `src/lib/expense-validators.ts`
  - **Responsibility**: valibot schemas for expense create/update, category create/rename, tag create/rename, filter query strings.
  - **Interface**: one exported schema per form and a thin `parse` helper returning a `Result`.
  - **Tested**: yes

- **`expense-repo` module**
  - **Name**: `src/lib/expense-repo.ts`
  - **Responsibility**: All DB reads and writes for expenses, categories, tags, recurring templates, and the two join tables. Enforces referential-integrity rules, performs atomic multi-create on inline category/tag confirmation, implements merge-on-rename, and provides the idempotent materialization primitive used by the cron.
  - **Interface** (sketch):
    - `listExpenses(filters): Promise<ExpenseRow[]>`
    - `getExpense(id): Promise<ExpenseRow | null>`
    - `createExpense(input, newCategoryName?, newTagNames?): Promise<Result<Expense, RepoError>>`
    - `updateExpense(id, input, ...): Promise<Result<Expense, RepoError>>`
    - `deleteExpense(id): Promise<Result<void, RepoError>>`
    - `listCategories() / createCategory / renameCategory / mergeCategory / deleteCategory`
    - `listTags() / createTag / renameTag / mergeTag / deleteTag`
    - `listRecurring() / getRecurring / createRecurring / updateRecurring / deleteRecurring`
    - `materializeRecurring(today): Promise<{ generated: number; failed: { recurringId: string; error: string }[] }>` — iterates all templates, calls the `recurrence` module for dates, inserts `expense` rows with `recurringId` + `occurrenceDate`, swallows unique-constraint violations as no-ops.
    - `summarize(grouping, granularity, filters): Promise<SummaryRow[]>`
  - Failure modes: `NotFound`, `Conflict` (unique), `Referenced` (delete blocked), `ValidationError`.
  - **Tested**: yes (integration tests against local D1 / in-memory SQLite)

- **Route modules** (`src/routes/expenses/`, `src/routes/categories/`, `src/routes/tags/`, `src/routes/summary/`, `src/routes/recurring/`)
  - **Responsibility**: Thin HTTP handlers and JSX pages; no business logic beyond wiring validators, the repo, and rendering.
  - **Interface**: each file exports a single `build…` or `handle…` function following the existing project convention.
  - **Tested**: via Playwright e2e only.

- **Scheduled handler**
  - **Name**: `src/scheduled.ts` (new), wired into the default export alongside `fetch` in `src/index.ts`.
  - **Responsibility**: Nightly `scheduled(event, env, ctx)` entrypoint. Builds the DB client, calls `expense-repo.materializeRecurring(todayEt())`, logs results, and sends a Pushover notification on any caught failure.
  - **Interface**: the Cloudflare Workers `ExportedHandlerScheduledHandler` signature.
  - **Tested**: via Playwright e2e exercising the `/test/run-cron` dev-only route, plus unit tests of `recurrence` and `expense-repo.materializeRecurring`.

- **Client JS enhancement modules** (`public/js/category-combobox.js`, `public/js/tag-chip-picker.js`)
  - **Responsibility**: Progressive enhancement of the category and tag inputs.
  - **Interface**: vanilla-JS auto-init on DOM elements with specific `data-*` attributes; degrades gracefully when absent.
  - **Tested**: via Playwright e2e only.

## Testing Decisions

- Tests assert external behavior, not implementation details.
- **Playwright e2e**: full coverage of entry, list, filter, summary, CRUD for categories and tags, progressive-enhancement paths (JS on and off for at least one smoke test per enhanced input), and all major failure modes (validation errors, delete-blocked, merge-on-rename).
- **Unit tests**:
  - `money`: parsing and formatting table tests (including malformed inputs).
  - `et-date`: boundary tests around DST transitions and month boundaries.
  - `recurrence`: occurrence-date tables covering Monthly/Quarterly/Yearly with anchors on days 1, 15, 28, 29, 30, 31; Feb 29 yearly anchors in leap and non-leap years; catch-up across multiple missed periods; first-occurrence rule for newly created templates.
  - `expense-validators`: schema pass/fail tables, including the recurring-template schema.
  - `expense-repo`: CRUD, referential integrity, merge-on-rename, AND/OR tag filtering, summary aggregation math (especially by-tag double-counting and percent-of-total), `materializeRecurring` idempotency and catch-up, `ON DELETE SET NULL` behavior when a template is deleted.
- **Prior art**: existing Playwright tests under `e2e-tests/` and helpers in `e2e-tests/support/` are the reference for navigation, form submission, and validation assertions. Reuse helpers where available; add new helpers for expense/category/tag forms in the same style.

## Out of Scope

- Importing expenses from CSV, OFX, QIF, or any bank feed.
- Exporting expenses to CSV, PDF, or any other format.
- Receipts or any file attachments.
- Budgets, planning, or forecasting.
- Any email notifications related to expense activity.
- Multi-currency support; only USD.
- Mobile-native app; web-browser only.
- Offline support / PWA.
- Internationalization; US English only.
- Per-user ownership, access control beyond signed-in/not, or admin roles.
- Audit fields (createdBy / updatedBy) on any row.
- Pagination on the list view.
- Charts or non-table visualizations on the summary page.
- Maximum-amount cap on expenses.
- End dates, pause/resume, or "stop after N occurrences" for recurring templates — templates run forever until deleted.
- Bi-weekly, weekly, or custom-interval recurrences — only Monthly, Quarterly, and Yearly are supported.
- Time-of-day scheduling for the cron beyond the fixed 05:00 UTC nightly run; no DST adjustment of the cron schedule.

## Open Questions

None at this time. If any arise during implementation, they will be added here with an owner and a suggested resolution path.

## Further Notes

- This feature must not break any existing auth, sign-up, or email flows; existing Playwright tests for those flows must continue to pass unchanged.
- Follow the project's `// PRODUCTION:REMOVE` / `// PRODUCTION:UNCOMMENT` conventions for any dev-only routes or test hooks added for expense-feature testing.
- Field max lengths in forms follow the project convention: a constant per file with a `// PRODUCTION:UNCOMMENT` production value and a slightly-larger test value.
- `data-testid` attributes follow the project convention: kebab-case, `name-action` (e.g. `expense-save`, `category-delete`).
