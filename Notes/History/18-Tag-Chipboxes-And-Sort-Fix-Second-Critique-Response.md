# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Read through the updated @[Notes/Ideas.md] , @[Notes/PRD-expense-log.md] , and @[Notes/issues/18-tag-chipboxes-and-sort-fix.md] and address the issues raised in @[Notes/review-issue-18-2.md] . Rewrite @[Notes/PRD-expense-log.md] and @[Notes/issues/18-tag-chipboxes-and-sort-fix.md] as necessary to address the issues found.

*Viewed [review-issue-18-2.md](file:///Users/chris/hacks/expenses/expense-log/Notes/review-issue-18-2.md) *

*Viewed [Ideas.md](file:///Users/chris/hacks/expenses/expense-log/Notes/Ideas.md) *

*Viewed [PRD-expense-log.md](file:///Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md) *

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md) *

*Viewed [PRD-expense-log.md](file:///Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md) *

*Viewed [PRD-expense-log.md](file:///Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md) *

### Planner Response

Now I'll make the edits. Starting with the PRD to address each review issue.

*Edited relevant file*

### Planner Response

PRD updates complete. Now I'll update Issue 18 with grouped acceptance criteria, the additional contract clarifications, and recurring-confirmation routes in verify/criteria.

*Edited relevant file*

### Planner Response

Fix the verify-list numbering (16a appears before 16):

*Edited relevant file*

### Planner Response

Both files are updated. Here's a summary of the changes addressing every item in `@/Users/chris/hacks/expenses/expense-log/Notes/review-issue-18-2.md`:

## Changes

**`@/Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md`**

- **Date-range default** (Solution, story 21/29/38, Dates section, Summaries date-range): consistent wording — "first day of the month two months before today through today in ET", equivalent to "current calendar month plus two preceding calendar months".
- **Tag character set** (Category/tag semantics): explicit ASCII-only, `^[a-z0-9_-]{1,20}$`.
- **`newTags`** (Tag input contract): added separator examples (`foo,bar`, `foo bar`, `foo, bar`, `foo,,bar`, `foo\nbar`, `foo,  bar , baz`), tied to the ASCII regex.
- **`tagId` syntactic validation + count cap**: new bullet in Tag input contract — ULID format check before DB lookup; mutation cap (e.g. 64) is an error, list/Summary truncate silently.
- **Dimension-aware sort validation**: new Summaries bullet — sort columns are only valid if present in the dimension's result table (plus `count`, `total`, `timePeriod`); invalid → fall back to defaults.
- **Untagged expenses in tag summaries**: new Summaries bullet — contribute no rows under `Tag` / `Category + Tag`.
- **Stale `tagId` rendering**: clarified — page renders, stale ids simply omitted from filter UI.
- **Unexpected DB read failures**: new Summaries bullet — standard error response, log without sensitive data.
- **Confirmation race extended to categories**: existing category race/collision handling preserved.
- **Confirmation revalidation**: new contract bullet — hidden inputs never trusted; full revalidation.
- **Confirmation atomicity restated**: new contract bullet — all-or-nothing transaction.
- **Legacy/invalid stored data safe rendering**: new Safe-rendering bullet — escaping applies unconditionally to stored values, including legacy data violating current rules.

**`@/Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md`**

- Same content changes propagated to the issue's server-contract section (sections 3, 5, 7, 8).
- **Recurring confirmation routes**: explicitly named in section 3 (handler list), verify step 5, verify step 14, and the acceptance criteria.
- **Acceptance criteria grouped under headings**: `Tag UI`, `Mutation validation`, `Confirmation / race behavior`, `Summary sorting`, `Security and progressive enhancement`.
- New manual verify steps **12a** (invalid-format & over-cap `tagId`), **12b** (out-of-dimension sort), **14a** (hidden-field tampering), **14b** (mid-confirmation failure atomicity), **16** (untagged-in-tag-summary).
- New acceptance criteria for: ULID/cap `tagId` validation, dimension-aware sort fallback, untagged-summary behavior, hidden-input revalidation, atomicity, category-race preservation, recurring-confirmation routes, legacy-name safe rendering, filter-side `tagId` caps.