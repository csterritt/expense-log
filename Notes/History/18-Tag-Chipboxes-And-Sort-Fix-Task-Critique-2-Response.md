# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Read through the updated @[Notes/Ideas.md] , @[Notes/PRD-expense-log.md] , @[Notes/issues/18-tag-chipboxes-and-sort-fix.md] , @[Notes/tasks/18-tag-chipboxes-and-sort-fix.md] , and @[Notes/review-task-18-2.md] and implement the changes in the review file to the appropriate files.

*Viewed [review-task-18-2.md](file:///Users/chris/hacks/expenses/expense-log/Notes/review-task-18-2.md) *

*Viewed [Ideas.md](file:///Users/chris/hacks/expenses/expense-log/Notes/Ideas.md) *

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md) *

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md) *

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md) *

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md) *

*Grep searched codebase*

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md) *

*Grep searched codebase*

*Viewed [PRD-expense-log.md](file:///Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md) *

*Grep searched codebase*

*Grep searched codebase*

*Viewed [PRD-expense-log.md](file:///Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md) *

### Planner Response

I have enough context. Now I'll apply the review's recommended edits to the PRD, issue, and tasks files. Ideas.md is high-level and doesn't need changes for this review's concerns.

Let me make targeted edits.

**1. PRD: tamper-detection strategy, uppercase ULID, body size, category contract, calendar dates, Category+Tag tie-breakers**

*Edited relevant file*

### Planner Response

Now strengthen the confirmation revalidation paragraph with the tamper-detection strategy:

*Edited relevant file*

### Planner Response

Now update PRD malformed-query handling for invalid calendar dates, Category+Tag tie-breakers, and error-handling distinction:

*Edited relevant file*

### Planner Response

Now add Category+Tag tie-breakers in the Sort line and clarify in user story 41:

*Edited relevant file*

### Planner Response

**2. Issue file edits — uppercase ULID + body size + category contract + tamper strategy + invalid calendar dates:**

*Edited relevant file*

### Planner Response

Now strengthen confirmation revalidation with the tamper strategy and add a parallel category contract:

*Edited relevant file*

*Edited relevant file*

### Planner Response

Now add an acceptance criterion line for invalid calendar dates and update the tamper criterion to be specific about HMAC:

*Edited relevant file*

### Planner Response

Add an invalid-calendar acceptance criterion next to the malformed-query one:

*Edited relevant file*

### Planner Response

**3. Tasks file edits.** Update task 1 (split parser-purity vs spy), task 13 (duplicate constants instead of extract), task 14 (split deps), task 22 (global uniqueness instead of per user-scope), task 23 (HMAC), and others:

*Edited relevant file*

### Planner Response

Clean up leftover guidance line from the old task 14:

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

### Planner Response

All review recommendations are now incorporated. Summary of edits:

## Summary

**[Notes/PRD-expense-log.md](file:///Users/chris/hacks/expenses/expense-log/Notes/PRD-expense-log.md:0:0-0:0)**
- Added uppercase-only ULID specification with regex; clarified raw-count cap before dedupe.
- Added new bullet on request-body/query-string limits referencing the existing body-size middleware.
- Added a parallel **Category input contract** bullet (ULID validation, race reuse, confirmation revalidation).
- Strengthened **Confirmation revalidation** to require HMAC signature over canonical payload (or equivalent server-side pending state) — revalidation alone cannot detect equivalent-valid tampering.
- Added **Error-handling distinction** (validation/conflict vs. infrastructure) referencing the shared `log-capture` / `withForcedDbError` helper.
- Promoted invalid-calendar-date handling (`2026-02-31`, etc.) into the malformed-query rules.
- Added Category+Tag tie-break rules explicitly into the Sort bullet.

**[Notes/issues/18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/18-tag-chipboxes-and-sort-fix.md:0:0-0:0)**
- Uppercase ULID regex + raw-count cap clarification.
- New bullet on body-size limit as outer bound.
- New **Category input contract** sub-bullet block.
- Strengthened confirmation revalidation bullet with HMAC/pending-state requirement, called out tamper limits of pure revalidation.
- Acceptance criteria updated for: tamper (HMAC/pending-state, four cases), invalid calendar dates.
- Malformed-query handling now includes invalid calendar dates.

**[Notes/tasks/18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md:0:0-0:0)**
- **Task 1** split into `1a` (pure parser tests, no DB) and `1b` (handler/repository spy tests).
- **Task 12** restricted optimistic-chip JS to non-form-control elements; dropped `value` from safe-attribute allow-list.
- **Task 13** changed from "extract shared constants" to "duplicate named constants + parity test" (no build step).
- **Task 14** split into `14a/14b/14c/14d` with correct dependencies so Red/Green sequencing is executable (`14a` → task 15; `14b`/`14c` → after task 24; `14d` → after task 12).
- **Task 15** now only depends on `14a`.
- **Task 22** changed "unique index per user-scope" to "**global** unique index" (matches no-per-user-ownership model); explicit HMAC/pending-state tamper assertions added; references shared log helper.
- **Task 23** now requires HMAC verification before normal revalidation, reads signing key from a Worker secret, uses shared log helper.