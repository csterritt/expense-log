# PRD: Expense Log

## Problem Statement

Signed-in users of the app need a simple way to record spending as it happens and to make sense of it later. Today the app only provides authentication — there is no way to capture an expense, organize it with categories or tags, or look back at what has been spent. Users want to log expenses in the moment, not plan them in advance, and then search, filter, and summarize that history to understand where their money is going.

## Solution

When the feature is complete, any signed-in user can:

- Log an expense in a few seconds from a form that sits at the top of the default landing page.
- Pick a category from a searchable dropdown (or create one inline) and attach zero or more tags by toggling checkbox-chips that show every existing tag (with an inline affordance to create new tags).
- See the most recent expenses — the current calendar month plus the two preceding calendar months, inclusive (from the first day of the month two months before today through today in ET) — in a single scrollable list, newest first.
- Search that list by description and filter it by an arbitrary date range, by category, and by one or more tags (with an AND/OR toggle for tags).
- View summaries on a dedicated page: pick a group-by dimension (`Time only`, `Category`, `Tag`, or `Category + Tag`), a time-period granularity (`Month`, `Quarter`, or `Year`), an optional tag filter (AND when more than one), and an optional date range.
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
7. As a signed-in user, I want every existing tag rendered as a checkbox-chip in a single block above the submit button, sorted alphabetically (case-insensitive) and wrapping to the viewport width, so that I can see at a glance every tag that exists.
8. As a signed-in user, I want to toggle a tag's selection by clicking its chip (selected state visually distinct from unselected), so that attaching or detaching a tag is one click.
9. As a signed-in user, I want each tag to be selectable at most once (the checkbox model makes duplicates structurally impossible), so that a tag appears at most once on an expense.
10. As a signed-in user, I want a small inline "new tag" text input adjacent to the chip block that lets me add one or more brand-new tag names, each of which appears as an already-selected chip and is confirmed via the standard inline-create flow on submit, so that I can create tags without leaving the form.
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

21. As a signed-in user, I want the default landing page after sign-in to show the entry form at top and a list below of all expenses whose date falls in the default window — the current calendar month plus the two preceding calendar months, inclusive, from the first day of the month two months before today through today in ET — so that I see what's recent without filtering.
22. As a signed-in user, I want the list sorted by date descending, ties broken by description ascending (case-insensitive), so that ordering is predictable.
23. As a signed-in user, I want all matching rows rendered on one page with no pagination, so that I can scroll or use Ctrl-F across the full view.
24. As a signed-in user, if there are no matching expenses, I want an empty-state message under the form, so that the page doesn't look broken.
25. As a signed-in user, I want each row to show date, description, category, tags, and formatted amount (e.g. `$1,234.56`), so that I can read expenses at a glance.
26. As a signed-in user, I want each row to have a single "Edit" button that takes me to an edit page, so that modification is one click away.

### Search and filter

27. As a signed-in user, I want a single search input that matches a case-insensitive substring against the description, so that I can narrow the list by what the expense was for.
28. As a signed-in user, I want a date-range filter with "from" and "to" fields, each independently optional (open-ended ranges allowed), so that I can look at any window.
29. As a signed-in user, I want the date-range default — on first load of the filter UI — to be from the first day of the month two months before today through today in ET, matching the default list view.
30. As a signed-in user, I want a category filter that picks zero or one category, so that I can narrow by a single category.
31. As a signed-in user, I want a tag filter rendered as the same alphabetically-sorted, wrapping block of checkbox-chips used on the entry form (no inline create here — filtering only operates over existing tags), with an AND/OR toggle ("all tags must appear" vs "any tag, at least one"), so that I can intersect or union across tags using a consistent UI.
32. As a signed-in user, I want search, date-range, category, and tag filters to combine with AND semantics across fields (tag-internal semantics governed by the toggle), so that I can progressively narrow results.
33. As a signed-in user, I want to clear all filters with one control, so that I can return to the default view.

### Summaries

34. As a signed-in user, I want a Summary page (linked from the header) whose default view groups by Category with Month granularity, no tag filter, and a date range matching the default list window, so that I see a useful summary without configuring anything.
35. As a signed-in user, I want a "group-by dimension" selector with four mutually-exclusive options — `Time only`, `Category`, `Tag`, `Category + Tag` — so that I can shape the summary to what I want to see.
36. As a signed-in user, I want a "time-period granularity" selector with `Month` (default), `Quarter`, and `Year`, so that I can summarize at the resolution I care about.
37. As a signed-in user, I want the summary's tag filter rendered as the same alphabetically-sorted, wrapping block of checkbox-chips used on the entry and list-filter UIs (no inline create), accepting zero or more tags with AND semantics when more than one is selected (empty = include all expenses), so that I can narrow the summary to a specific tag combination before grouping using a consistent UI.
38. As a signed-in user, I want a date-range filter with optional `from` / `to` fields whose first-load default matches the list default (first day of the month two months before today through today in ET), and a one-click control to clear all filters back to defaults, so that I can scope the summary to any window.
39. As a signed-in user, I want the result table's columns to be derived from the group-by dimension — a `category` column iff the dimension includes Category, a `tag` column iff the dimension includes Tag, a time-period column always, plus `count` and `total` — with no grand-total row and no percent-of-total column, so that every row stands alone and I am not misled by sums of double-counted tag rows.
40. As a signed-in user, I want the time-period column rendered with its year so that data from different years never visually collide: Month is `Mmm YYYY` (e.g. `Mar 2026`, ET), Quarter is `Mmm-Mmm YYYY` (e.g. `Jan-Mar 2026`), and Year is `YYYY`. Aggregation keys carry the year too — Month and Quarter rows do not roll up across years.
41. As a signed-in user, I want every column header to be clickable to toggle ascending / descending sort by that column, where the time-period column sorts **chronologically** by an internal year-aware key (year, then month/quarter index — e.g. `Jan 2026` before `Feb 2026`, and `Dec 2025` before `Jan 2026`) and never by the rendered label's alphabetical order, with default = group columns ascending and then time-period chronologically ascending. When the user clicks `count`, `total`, `category`, or `tag`, ties break on the default group/time ordering (group columns ascending, then chronological time-period ascending). An empty-state message renders when no rows match, and recurring-generated expenses are counted exactly like manual ones but only after the cron has materialized them (a future-dated occurrence is never anticipated by the summary), so that the table is sortable, never blank-looking, and consistent with the list.

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
- Default list window is `[first day of the month two months before today, today]` inclusive, computed in ET. (Equivalently: the current calendar month plus the two preceding calendar months.)

### Category/tag semantics

- Names normalized to lowercase on input; display lowercase.
- **Allowed character set**: ASCII letters (`a`–`z`), ASCII digits (`0`–`9`), ASCII hyphen (`-`), and ASCII underscore (`_`) only. No whitespace, no Unicode letters, no other punctuation. After trimming and lowercasing, normalized names must match `^[a-z0-9_-]{1,20}$`.
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

- **Group-by dimension** selector with four mutually-exclusive options:
  - `Time only` — columns `time-period | count | total`.
  - `Category` — columns `category | time-period | count | total`.
  - `Tag` — columns `tag | time-period | count | total`. Expenses with N tags contribute one row per tag (intentional double-count).
  - `Category + Tag` — columns `category | tag | time-period | count | total`. Same tag double-counting rule.
- **Time-period granularity** selector: `Month` (default) | `Quarter` | `Year`. The time-period column is always present (one of three formats below).
- **Time-period column formats** (all anchored to `America/New_York`):
  - Month: `Mmm YYYY` (capitalized calendar month name abbreviation followed by the four-digit year, e.g. `Mar 2026`).
  - Quarter: capitalized `Mmm-Mmm YYYY` for calendar Quarter (`Jan-Mar 2026`, `Apr-Jun 2026`, `Jul-Sep 2026`, `Oct-Dec 2026`).
  - Year: `YYYY`.
- **Time-period aggregation keys**: Month and Quarter rows are keyed by `(year, monthIndex)` / `(year, quarterIndex)`; rows from different calendar years never aggregate together. Sorting uses these internal keys, not rendered labels.
- **Tag filter**: zero or more tag ids, rendered as the shared chip-checkbox block (alphabetically sorted, wrapping, no inline create). Empty = include all expenses. Two or more selected = AND (expense must carry every selected tag). The filter narrows the expense set before grouping; it does not change which columns appear (column visibility is governed solely by the group-by dimension).
- **Date-range filter**: optional `from` / `to` (`YYYY-MM-DD`), inclusive. First-load default matches the list default (first day of the month two months before today through today, ET). Open-ended ranges allowed. A single "Clear" control resets all filters and the dimension/granularity selectors to defaults.
- **Defaults**: group-by `Category`, granularity `Month`, no tag filter, date range = list default.
- **Row semantics**: every row stands alone. `count` is the number of (expense, group-key) participations contributing to the row; `total` is the sum of `amountCents` for those participations. **There is no grand-total row and no percent-of-total column.** When the dimension includes `Tag`, an expense with N tags contributes once per tag (so summing `count` or `total` across rows can exceed the underlying expense count/total — intentional, surfaced with a short inline note on the page).
- **Sort**: every column header is clickable to toggle ascending / descending sort by that column. Default sort = group columns ascending (case-insensitive alphabetical for category/tag), then time-period **chronologically** ascending using the internal `(year, monthIndex|quarterIndex)` key. The time-period column always sorts on this internal key (year first, then month/quarter index for Month/Quarter; numeric for Year) regardless of its rendered label. **No code path in the Summary sort may compare rendered month or quarter labels alphabetically.** When the user clicks `count`, `total`, `category`, or `tag`, ties retain the default ordering (group columns ascending, then chronological time-period ascending). For the `Category + Tag` dimension specifically: clicked `category` (asc or desc) ties break on `tag asc` then `timePeriod asc`; clicked `tag` (asc or desc) ties break on `category asc` then `timePeriod asc`.
- **Sort-column validation (dimension-aware)**: sort columns are valid only if present in the current result table for the selected dimension, plus the always-present `count`, `total`, and `timePeriod`. For example: with dimension `Category` or `Time only`, `sort=tag` is invalid; with dimension `Tag` or `Time only`, `sort=category` is invalid. Invalid (out-of-dimension or unknown) sort columns and invalid sort directions fall back to defaults rather than erroring.
- **Empty results**: render an empty-state message under the controls.
- **Recurring/generated expenses**: counted exactly like manual expenses, but only `expense` rows already materialized at query time are included. A future-dated recurring occurrence is never anticipated — it participates in summaries only after the cron (or the dev-only manual trigger) has inserted the row.
- **Untagged expenses in tag-grouped summaries**: when the dimension is `Tag` or `Category + Tag`, expenses with no tags contribute no rows to the summary (they have no group key to contribute to). They still participate in `Time only` and `Category` summaries. No explicit "untagged" bucket is rendered; adding one is out of scope here.
- **Malformed query parameters**: handlers must never 500 on bad input. Unknown or syntactically invalid `tagId` values are silently dropped from the filter set (the page still renders with the remaining valid selections; stale ids simply disappear from the rendered filter UI); invalid `dimension`, `granularity`, sort column name (including out-of-dimension columns), or sort direction fall back to defaults; non-`YYYY-MM-DD` `from` / `to` values **and** shape-correct but invalid calendar dates (e.g. `2026-02-31`, `2026-13-01`, `2026-00-10`) are treated as absent. Validation errors here are not logged as server errors.
- **Error-handling distinction**: validation / conflict failures (input validation, malformed query, confirmation revalidation failure, unique-constraint name-collision conflict that is not silently resolved as race-reuse) re-render the form or confirmation page with a recoverable error and all values preserved; unexpected infrastructure failures (DB transport error, timeout, unknown crash) respond with the app's standard error response. Both paths follow the same logging discipline (route + error class + stack on infrastructure errors; no raw bodies, query strings, descriptions, amounts, or names ever logged). Tests use a single named log-capture / DB-error-injection helper (e.g. `tests/support/log-capture.ts` and the existing `withForcedDbError` hook used by `e2e-tests/support/`) rather than ad-hoc logging paths, so production and test logging stay aligned.
- **Unexpected read failures**: if the database read backing the list, filter, or Summary page fails unexpectedly (transport, timeout, etc.), handlers respond with the app's standard error response and log the route + error class + stack, but never the raw query string, form body, descriptions, amounts, or tag/category names.

### Forms and validation

- All form validation via valibot schemas in a dedicated module.
- Client-side validation via HTML attributes (`required`, `maxlength`, `pattern`, `min`).
- Form inputs use `value` (not `defaultValue`) for pre-population on edit and on re-render after validation errors.
- Post-redirect-get on successful create/update/delete.

### Tag input contract (server-authoritative)

The UI is never trusted; every handler revalidates. The contract applies uniformly to mutation forms (expense create/edit, recurring create/edit), the list-page tag filter, and the Summary tag filter, differing only in how unknown values are treated.

- **Submitted `tagId`**: zero or more repeated form or query values. Handlers must dedupe repeated `tagId` values on the server, then validate that each remaining id exists.
  - Mutation forms: an unknown or stale `tagId` (e.g. tag deleted between page render and submit) renders a recoverable global error on the form, with all other field values preserved.
  - List filter and Summary filter: unknown `tagId` values are silently ignored; the page still renders.
- **Submitted `newTags`** (mutation forms only): a single text field whose contents are split on any run of commas and/or ASCII whitespace, then for each token: trim → lowercase → drop empty tokens → enforce the allowed character set (`^[a-z0-9_-]{1,20}$`, ASCII only) → dedupe case-insensitively. Per-token validation rejects names that exceed 20 characters or contain disallowed characters. Examples of accepted separator forms: `foo,bar`, `foo bar`, `foo, bar`, `foo,,bar`, `foo\nbar`, `foo,  bar , baz` — all yield the tokens `[foo, bar]` or `[foo, bar, baz]`; empty tokens between separators are dropped. Raw-input safety limits also apply: the raw `newTags` string is capped (e.g. 500 characters) and the post-split token count is capped (e.g. 32 tokens); exceeding either is a recoverable validation error.
- **Submitted `tagId` caps and format validation**: before any DB existence lookup, each submitted `tagId` value must syntactically match the project's ID format (ULID — 26-character Crockford base32, uppercase-only per the regex `^[0-9A-HJKMNP-TV-Z]{26}$`; lowercase input is rejected as invalid format, not silently uppercased — every id generated or stored in the system is uppercase). Invalid-format values are treated as unknown ids (mutation forms: recoverable global error; list/Summary filters: silently dropped) and never reach the database. Mutation submissions are additionally capped at a maximum count of submitted `tagId` values (e.g. 64) measured on the **raw** submitted count before dedupe; exceeding the cap is a recoverable validation error. List and Summary filter requests truncate excessive `tagId` values (same cap) and ignore the remainder rather than erroring, so the page still renders.
- **Request-body / query-string limits**: the existing global request-body size limit (see `index.ts` body-size middleware) is the outer bound on `newTags`, repeated `tagId`, and confirmation payloads; the per-field caps above are inner bounds that produce recoverable validation errors before any DB work. Query-string handlers (list filter, Summary) apply the same `tagId` cap by truncation, never erroring on excess length.
- **Category input contract (parallel to tags)**: every mutation form and confirmation handler validates the submitted `categoryId` (single value, optional only when a new category name is being introduced) against the same ULID regex `^[0-9A-HJKMNP-TV-Z]{26}$` before any DB lookup; invalid-format values are treated as unknown. Unknown / stale `categoryId` on mutation forms produces a recoverable global error with all values preserved. A submitted new-category name is trimmed → lowercased → validated against `^[a-z0-9_-]{1,20}$`; longer or character-set-violating names produce a recoverable validation error. Confirmation-time race: if another request creates a category with the same name between the initial submit and the confirm submit, the confirm handler reuses the existing row (silently selecting it) rather than failing with a generic unique-constraint conflict — extending, not replacing, the existing category race/collision handling. Confirmation revalidation re-runs the same checks on every submit; the category-name uniqueness is enforced globally (case-insensitive) by a DB-level unique index on `category.name`, since all signed-in users share the same category set.
- **Collision between `tagId` and `newTags`**: if a normalized `newTags` token matches the lowercase name of any existing tag (whether selected via `tagId` or not), treat it as a selection of the existing tag — do not create a confirmation entry for an already-existing name, and do not double-attach.
- **Confirmation-time race (tags and categories)**: if, between the initial submit and the confirmation submit, another request creates a tag (or category) with the same name, the confirm handler must reuse the now-existing row (silently attach the tag, or select the existing category) rather than failing with a generic unique-constraint conflict. The existing category race/collision handling already in place must remain intact — this contract extends, not replaces, the category behavior. Any other unique-constraint failure surfaces a recoverable user-facing message that re-renders the confirmation page with all values preserved.
- **Confirmation revalidation (server-authoritative)**: hidden inputs on the confirmation page are a convenience for round-tripping user input only — the confirm handler must fully re-run every validation step (field shape, character-set, length, caps, `tagId` syntactic check, `tagId` existence, collision normalization, money parsing, date validity, etc.) on the submitted confirmation payload and must not trust any value carried by hidden fields from the prior step. Revalidation alone proves the payload **is valid**; it cannot prove the payload is **the same** values shown on the confirmation page (e.g. a hidden amount changed from `10.00` to a valid `20.00` would otherwise pass). To detect such tampering, the confirmation page carries an HMAC signature over the canonical confirmation payload (sorted keys, normalized values, plus the user id and a server-side secret); the confirm handler recomputes the HMAC over the submitted payload and rejects the request with a recoverable error if the signatures do not match, before running normal validation. The signing secret is a Worker secret rotated separately from session keys. Equivalently-acceptable alternative: persist the pending confirmation payload server-side under a short-lived key referenced by an opaque token in the hidden form, and reject any divergence between the token's stored payload and the submitted payload.
- **Atomicity at confirmation time**: confirmation creates/reuses categories, tags, and the resulting expense/recurring template in a single database transaction. If any step of the confirmation fails — including unique-constraint races, validation errors discovered on re-check, or unexpected DB errors — no partial expense, template, category, or tag rows are persisted, and the user is returned to a recoverable error state with all values preserved.
- **Validation-error preservation**: every re-render path (form validation error, confirmation cancel, confirmation-time conflict) preserves chip selections, `newTags` text, the new-category text, and all other field values — on the entry form, the edit form, and the recurring create/edit forms.
- **Auth gating**: every page and POST handler touched by this contract continues to require signed-in access via the existing middleware (same pattern as `buildPrivate`); this includes confirmation routes and the recurring equivalents.

### Safe rendering of user-controlled values

- **Server-rendered HTML**: tag names, new-tag tokens, category names, and any other user-controlled value rendered into chip labels, hidden inputs, preserved form values, error messages, and confirmation pages must be HTML-escaped by the renderer (JSX's default escaping is sufficient; never inject via `dangerouslySetInnerHTML`).
- **Legacy / invalid stored data**: although current validation rejects new tag/category names containing characters outside `^[a-z0-9_-]{1,20}$`, the renderer must still safely escape any stored name that violates the current rules (e.g. legacy rows predating the constraint, names introduced by direct DB mutation, or names produced by a prior bug). Safe rendering applies unconditionally to stored values, never "only when the validator would have accepted them."
- **Client JS**: optimistic chips and any DOM nodes built from user input must use safe DOM APIs (`textContent`, `setAttribute`) — never `innerHTML` for user-controlled strings.
- **Optimistic chips are visual only**: JS-created chips render selected names visually, but the submitted form data still flows through the existing native fields (`tagId` checkboxes for existing tags, `newTags` text input for new names). The server never trusts JS-only state.

### Error handling and logging

- **JS failure isolation**: an exception in `tag-chip-checkboxes.js` or `category-combobox.js` must not block native checkbox toggling or form submission; enhancement code is wrapped so that init failures are swallowed (logged to `console.error` only).
- **Asset 404 tolerance**: removing `public/js/tag-chip-picker.js` must not produce a 404 from any rendered page; all `<script>` references to it are removed in the same change.
- **Logging scope**: validation errors are not logged as server errors. Unexpected server errors in post/confirm handlers log route, error class, and stack — but never raw form bodies, full query strings, expense descriptions, amounts, or tag names. (Data is shared across signed-in users; logs may have broader exposure.)

### Client JS (progressive enhancement)

- Add a small vanilla-JS bundle served as a static asset that enhances:
  - **Category combobox**: `<input list>` + custom dropdown listing existing categories filtered by typed text, with a "Create 'foo'" affordance; falls back to a plain text input when JS is off.
  - **Tag chip-checkbox block**: every existing tag is rendered server-side as a labeled checkbox styled as a chip, alphabetically sorted (case-insensitive) and wrapping to the viewport. Toggling a chip toggles its underlying checkbox; the form submits the standard checkbox name/value pairs. On the entry and recurring-template forms (only), an additional small text input next to the block lets the user add one or more new tag names (comma- or whitespace-separated); JS optimistically renders them as already-selected chips, and the server-side confirmation page handles them via the same inline-create flow used for new categories. The block degrades gracefully without JS: the checkboxes work natively, and the new-tag text input is submitted as-is to the same confirmation flow.
- Without JS, both inputs still submit names; the server-side confirmation page handles unknown-name creation identically for both paths.
- The same chip-checkbox block component (without the new-tag input) is reused by the list-page tag filter and the summary-page tag filter, so the tag-selection UI is consistent across entry, filter, and summary.

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
    - `monthKeyEt(ymd: string): { year: number; monthIndex: number; label: string }`, `quarterKeyEt(ymd: string): { year: number; quarterIndex: number; label: string }`, `yearKeyEt(ymd: string): { year: number; label: string }` — internal chronological keys plus rendered labels (`Mmm YYYY`, `Mmm-Mmm YYYY`, `YYYY`) for date-grouped summaries; sort uses the numeric fields, render uses `label`.
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
    - `summarize(input: { dimension: 'time' | 'category' | 'tag' | 'category-tag'; granularity: 'month' | 'quarter' | 'year'; filters: { from?: string; to?: string; tagIds?: string[] }; sort?: { column: string; direction: 'asc' | 'desc' }[] }): Promise<SummaryRow[]>` — returns rows whose shape matches the requested dimension (group columns + time-period + count + total). Each row carries an internal `(year, monthIndex|quarterIndex)` chronological key for sorting plus the rendered label (`Mmm YYYY` / `Mmm-Mmm YYYY` / `YYYY`); Month/Quarter rows from different years are distinct rows and never aggregate together. The `sort` input is validated against an allow-list of column names and directions; unknown values fall back to defaults rather than erroring. No grand total. Tag dimensions intentionally double-count multi-tagged expenses.
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

- **Client JS enhancement modules** (`public/js/category-combobox.js`, `public/js/tag-chip-checkboxes.js`)
  - **Responsibility**: Progressive enhancement of the category dropdown and the tag chip-checkbox block (including the new-tag inline-add affordance on entry/recurring forms).
  - **Interface**: vanilla-JS auto-init on DOM elements with specific `data-*` attributes; degrades gracefully when absent (native checkboxes continue to work, the new-tag text input flows through the confirmation page).
  - **Tested**: via Playwright e2e only.

## Testing Decisions

- Tests assert external behavior, not implementation details.
- **Playwright e2e**: full coverage of entry, list, filter, summary, CRUD for categories and tags, progressive-enhancement paths (JS on and off for at least one smoke test per enhanced input), and all major failure modes (validation errors, delete-blocked, merge-on-rename).
- **Unit tests**:
  - `money`: parsing and formatting table tests (including malformed inputs).
  - `et-date`: boundary tests around DST transitions, month boundaries, and the month/quarter/year key formatters (including quarter-label casing).
  - `recurrence`: occurrence-date tables covering Monthly/Quarterly/Yearly with anchors on days 1, 15, 28, 29, 30, 31; Feb 29 yearly anchors in leap and non-leap years; catch-up across multiple missed periods; first-occurrence rule for newly created templates.
  - `expense-validators`: schema pass/fail tables, including the recurring-template schema.
  - `expense-repo`: CRUD, referential integrity, merge-on-rename, AND/OR tag filtering, summary aggregation math across all four dimensions and all three granularities (covering by-tag double-counting, AND tag-filter narrowing, sort toggling, **chronological** time-period ordering by internal `(year, monthIndex|quarterIndex)` key for Month and Quarter granularities — verifying that `Apr 2026` follows `Jan 2026`/`Feb 2026`/`Mar 2026`, that `Apr-Jun 2026` follows `Jan-Mar 2026`, and that `Dec 2025` precedes `Jan 2026` regardless of label alphabetical order; that Month/Quarter rows from different years remain distinct; that ties on a clicked `count`/`total`/`category`/`tag` column break on the default group/time ordering; empty-result handling; that only materialized recurring rows participate; and that malformed query parameters fall back to defaults rather than erroring), server-side dedupe and existence-validation of submitted `tagId` values, `newTags` normalization (split, trim, lowercase, drop empty, dedupe, reject > 20 chars, raw-length and token-count caps), collision handling between `tagId` and `newTags`, confirmation-time race resolution (concurrent tag creation), `materializeRecurring` idempotency and catch-up, `ON DELETE SET NULL` behavior when a template is deleted.
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
- Field max lengths in forms follow the project convention: a constant per file with a `// PRODUCTION:UNCOMMENT` production value and a slightly-larger test value.
- `data-testid` attributes follow the project convention: kebab-case, `name-action` (e.g. `expense-save`, `category-delete`).
