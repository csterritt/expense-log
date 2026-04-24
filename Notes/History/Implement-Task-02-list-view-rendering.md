Read through SKILL.md in the @Notes/skills/issue-to-tasks directory, then do what it says. The issue to write tasks for is @02-list-view-rendering.md 

Analyzed
src/lib
Analyzed
e2e-tests/support
Analyzed
e2e-tests
Here is the proposed task list for Issue 02. After your feedback I'll write it to Notes/tasks/02-list-view-rendering.md.

Proposed Tasks for #02: Expense list view rendering
1. Create money module with formatCents
Type: WRITE Output: src/lib/money.ts exports formatCents(cents: number): string returning $1,234.56-style strings (US-English comma thousands, always 2 decimals, $ prefix, negative handling left unspecified since inputs come from amountCents > 0). No parseAmount yet. Depends on: none

Follow the arrow-function / functional style used in other modules under src/lib/. Keep the file small and focused; no DB or external imports.

2. Unit tests for money.formatCents
Type: TEST Output: tests/money.spec.ts covers 0, 1, 99, 100, 12345, 123456, 100000000 and confirms exact formatted output. Depends on: 1

Match the style of time-access.spec.ts and sign-up-utils.spec.ts. Use the existing bun test runner the other specs in tests already use.

3. Create et-date module
Type: WRITE Output: src/lib/et-date.ts exports todayEt(), defaultRangeEt(), and isValidYmd(s). todayEt returns the current YYYY-MM-DD in America/New_York; defaultRangeEt returns { from, to } where from = first of the month two months before todayEt and to = todayEt; isValidYmd returns true iff s is a valid calendar date in YYYY-MM-DD. Depends on: none

Use Intl.DateTimeFormat with timeZone: 'America/New_York' for the ET conversion (matches how Cloudflare Workers supports timezone conversion without extra deps). Allow todayEt to take an optional injected Date for testability, consistent with how src/lib/time-access.ts accepts an injected clock.

4. Unit tests for et-date
Type: TEST Output: tests/et-date.spec.ts covers: DST spring-forward and fall-back boundaries; month boundaries for defaultRangeEt (e.g. asserting Jan → Nov of previous year, Mar 1 → Jan 1); isValidYmd edges (2024-02-29 true, 2023-02-29 false, 2024-13-01 false, 2024-04-31 false, non-YYYY-MM-DD shapes false). Depends on: 3

Inject fixed reference dates via the optional todayEt parameter added in task 3. Do not use the system clock.

5. Extend expense-repo with listExpenses
Type: WRITE Output: src/lib/expense-repo.ts exports listExpenses(c, filters: { from: string; to: string }): Promise<ExpenseRow[]> returning expense rows (id, date, description, categoryName, amountCents, tagNames[]) whose date is in [from, to] inclusive, sorted by date DESC, then case-insensitive description ASC. No other filters are implemented yet; signature may accept a broader filters object but ignore other fields. Depends on: Issue 01 schema (already merged)

Follow the drizzle usage in src/lib/db-access.ts. Join expense → category for the name; left-join through expenseTag → tag and aggregate tag names via a grouped query or a second query keyed by expenseId (whichever is clearer given the existing db-access patterns). Case-insensitive tie-break on description via lower(description) asc in the ORDER BY. Define ExpenseRow as an exported type.

6. Test-only route to seed expenses
Type: WRITE Output: A new POST /test/database/seed-expenses route, guarded by isTestRouteEnabledFlag and marked // PRODUCTION:REMOVE, that accepts a JSON array of { date, description, amountCents, categoryName, tagNames? } objects and inserts categories/tags/expenses + join rows as needed. Response shape: { success: true, created: number }. Depends on: 5

Place alongside the existing /test/database/* routes (see src/lib/test-routes.ts and how it's wired). Reuse the test-route enablement pattern exactly so the endpoint is compiled out of production via the existing comment conventions.

7. Add seedExpenses e2e helper
Type: WRITE Output: e2e-tests/support/db-helpers.ts gains an exported seedExpenses(rows) function that POSTs to /test/database/seed-expenses in the same style as the existing seedDatabase helper. Depends on: 6

Match the error-handling and logging style of the existing helpers in the same file.

8. Render expense rows on /expenses
Type: WRITE Output: build-expenses.tsx now, for signed-in users, calls defaultRangeEt(), then listExpenses(c, range). When the result is non-empty, renders a table (DaisyUI table class) whose rows show date, description, category name, comma-separated tag names, and formatCents(amountCents). Table, rows, and key cells carry data-testids following project conventions (e.g. expense-row, expense-row-date, expense-row-amount). Empty-state from Issue 01 is preserved when the result is empty. Depends on: 5

Use DaisyUI/Tailwind styling consistent with build-layout.tsx. Do not add the entry form, filters, or Edit buttons — those belong to later issues. No pagination.

9. Playwright e2e for /expenses list rendering
Type: TEST Output: A new spec under e2e-tests/general/ (or a new expenses/ directory if that matches project convention) that: signs in a test user; seeds expenses in the current month, one and two months prior, plus one outside the window (three+ months back); asserts only in-window rows render, order is by date desc with case-insensitive description tiebreak, amount formatted as $1,234.56, and out-of-window row is absent. Depends on: 7, 8

Use seedExpenses from task 7 and sign-in helpers from e2e-tests/support/. Select rows via the data-testids introduced in task 8.

10. Walkthrough
Type: WALKTHROUGH Output: A showboat walkthrough under Notes/walkthroughs/02-list-view-rendering/ covering the money and et-date modules, listExpenses, the seed-expenses test route, and the list rendering on /expenses. Depends on: 9

Run uvx showboat --help first to confirm current flags.

11. Final human review
Type: REVIEW Output: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's How to verify / Acceptance criteria sections is satisfied. Depends on: 10

Questions before I write the file:

Order OK? schema→module→repo→test-route→helper→UI→e2e.
Any tasks too large? Task 8 (list rendering) is the biggest; I could split it into "render table shell" + "wire data + testids" if you prefer.
Any too small? Tasks 6 + 7 (seed route and its helper) could be merged into one if you'd like.
Extra REVIEW gates? Issue 02 is not HITL-flagged, so only the final review is included — confirm that's right.
Feedback submitted




Command Awaiting Approval

Answers:
Order is okay.
Task 8, 6, and 7 are fine as is.
No extra review games needed.
I've update the @Notes/skills/issue-to-tasks/SKILL.md file to specify when the DOCUMENTATION step should be done. Include that work in the task.
