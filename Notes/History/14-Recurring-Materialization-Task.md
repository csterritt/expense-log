# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Read the file SKILL.md under Notes/skills/issue-to-tasks and do what it says. the issue to write tasks for is @[Notes/issues/13-recurring-crud.md]  . write the new task file into Notes/tasks. notify me with the /home/chris/notify-app program (or /Users/chris/bin/notify-app if that's the available one) when you're done.

*Viewed [SKILL.md](file:///Users/chris/hacks/expenses/expense-log/Notes/skills/issue-to-tasks/SKILL.md) *

*Viewed [13-recurring-crud.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/13-recurring-crud.md) *

*Listed directory [tasks](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks) *

*Listed directory [issues](file:///Users/chris/hacks/expenses/expense-log/Notes/issues) *

*Viewed [08-edit-delete-expense.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/08-edit-delete-expense.md) *

*Listed directory [src](file:///Users/chris/hacks/expenses/expense-log/src) *

*Viewed [14-recurrence-materialization-dev-cron.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/14-recurrence-materialization-dev-cron.md) *

*Listed directory [routes](file:///Users/chris/hacks/expenses/expense-log/src/routes) *

*Listed directory [lib](file:///Users/chris/hacks/expenses/expense-log/src/lib) *

*Listed directory [db](file:///Users/chris/hacks/expenses/expense-log/src/db) *

*Listed directory [db](file:///Users/chris/hacks/expenses/expense-log/src/lib/db) *

*Viewed [build-recurring.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/build-recurring.tsx) *

*Viewed [schema.ts](file:///Users/chris/hacks/expenses/expense-log/src/db/schema.ts) *

*Listed directory [expenses](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses) *

*Grep searched codebase*

### Planner Response

Drafted the task list. Here it is for your review before I write the file. Quick summary:

## Proposed tasks for Issue 13: Recurring CRUD

1. **Add `recurrence.nextOccurrenceAfter` monthly-only stub** (WRITE) — `src/lib/recurrence.ts`. Output: pure module exporting `nextOccurrenceAfter({ recurrence, anchorDate, after })` with monthly-only logic + 28th-shift, throwing on Quarterly/Yearly until Issue 14. Depends: none.
2. **Unit tests for `nextOccurrenceAfter`** (TEST) — covers monthly anchor days 1/15/28/31, 28th-shift in Feb, deterministic output. Depends: 1.
3. **Add `listRecurring` to `expense-access`** (WRITE) — returns `(RecurringRow & { categoryName, tagIds, tagNames })[]` sorted by description asc. Depends: none.
4. **Unit test for `listRecurring`** (TEST). Depends: 3.
5. **Add `getRecurringById`** (WRITE). Depends: none.
6. **Unit test for `getRecurringById`** (TEST). Depends: 5.
7. **Add `createRecurringWithTags` + `createManyAndRecurring` atomic helpers** (WRITE) — mirrors `createExpenseWithTags` / `createManyAndExpense` but for recurring + recurringTag. Depends: none.
8. **Unit tests for create helpers** (TEST). Depends: 7.
9. **Add `updateRecurringWithTags` + `updateManyAndRecurring`** (WRITE). Depends: 5, 7.
10. **Unit tests for update helpers** (TEST). Depends: 9.
11. **Add `deleteRecurring`** (WRITE) — confirms FK `ON DELETE SET NULL` on `expense.recurringId` is honored. Depends: none.
12. **Unit test for `deleteRecurring`** (TEST) — seeds a generated expense row, deletes template, asserts `recurringId = NULL` and row preserved. Depends: 11.
13. **Add recurring-form validators** (WRITE) — `parseRecurringCreate` adds `recurrence ∈ {Monthly, Quarterly, Yearly}` and `anchorDate` (YYYY-MM-DD) on top of expense-form rules. Depends: none.
14. **Unit tests for the validators** (TEST). Depends: 13.
15. **Extract shared recurring-form renderer** (WRITE) — `src/routes/recurring/recurring-form.tsx` with `mode: 'create'|'edit'`. Depends: 13.
16. **Replace `/recurring` list page** (WRITE) — real list rendering (description, formatted amount, category, tags, recurrence capitalized, anchor date, next-occurrence date), New-button, sorted by description asc. Depends: 1, 3.
17. **Build `GET /recurring/new` + `POST /recurring`** (WRITE) — same flow as expense create incl. consolidated confirmation when new category/tag introduced. Depends: 7, 13, 15.
18. **Generalize consolidated confirmation page for recurring create** (WRITE) — adds `entity: 'expense'|'recurring'` mode (or new sibling renderer) with `/recurring/confirm-create-new`. Depends: 17.
19. **Wire `POST /recurring/confirm-create-new`** (WRITE). Depends: 7, 18.
20. **Build `GET /recurring/:id/edit` + `POST /recurring/:id/edit`** (WRITE) — pre-populated form, save-only path, route to confirmation if new items. Depends: 5, 9, 15.
21. **Wire `POST /recurring/:id/confirm-edit-new`** (WRITE). Depends: 9, 18.
22. **Build `GET /recurring/:id/delete` + `POST /recurring/:id/delete`** (WRITE). Depends: 5, 11.
24. **Playwright e2e: list + create with inline category/tag** (TEST). Depends: 16, 17, 18, 19.
25. **Playwright e2e: edit (no new items + with new tag through confirmation)** (TEST). Depends: 20, 21.
26. **Playwright e2e: delete preserves past generated rows** (TEST) — uses task 23. Depends: 22, 23.
27. **Playwright e2e: validation errors** (TEST) — desc>200, amount≤0, malformed anchor date, recurrence missing. Depends: 17, 20.
28. **Update wiki** (DOCUMENT). Depends: 27.
29. **Code walkthrough** (CODE WALKTHROUGH). Depends: 28.
30. **UI walkthrough** (UI WALKTHROUGH). Depends: 29.
31. **Final human review** (REVIEW). Depends: 30.

*Asked user a question*

*Edited relevant file*

*User accepted the command `ls /Users/chris/bin/notify-app /home/chris/notify-app 2>/dev/null`*

*User accepted the command `/Users/chris/bin/notify-app "Task file written: Notes/tasks/13-recurring-crud.md (32 tasks for Issue 13 recurring CRUD). Ready for your review."`*

### Planner Response

Wrote `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/13-recurring-crud.md` with 32 tasks (task 17 split into separate GET and POST as requested).

I tried to run `notify-app` but the command was skipped — please run it manually if needed, or let me know which path is correct and I'll retry.

### User Input

Read the file SKILL.md under Notes/skills/issue-to-tasks and do what it says. the issue to write tasks for is @[Notes/issues/14-recurrence-materialization-dev-cron.md]  . write the new task file into Notes/tasks.

*Listed directory [test](file:///Users/chris/hacks/expenses/expense-log/src/routes/test) *

*Viewed [test-routes.ts](file:///Users/chris/hacks/expenses/expense-log/src/lib/test-routes.ts) *

*Viewed [et-date.ts](file:///Users/chris/hacks/expenses/expense-log/src/lib/et-date.ts) *

*Viewed [time-access.ts](file:///Users/chris/hacks/expenses/expense-log/src/lib/time-access.ts) *

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

### Planner Response

Here's the proposed task list for Issue 14. I'll present then write after your approval.

## Proposed tasks for Issue 14: Recurrence engine + materialization + dev cron

1. **Extend `nextOccurrenceAfter` to Quarterly + Yearly** (WRITE) — `src/lib/recurrence.ts`. Replaces the Issue 13 monthly-only stub with full support (Quarterly = every 3 months from anchor month; Yearly = same month/day from anchor), preserving the 28th-shift rule (anchor day 29/30/31 → 28 in a short month, including Feb 29 anchor in Yearly → Feb 28 in non-leap years). Depends: Issue 13 task 1.
2. **Unit tests for `nextOccurrenceAfter` full coverage** (TEST) — Monthly/Quarterly/Yearly with anchor days 1, 15, 28, 29, 30, 31; Feb 29 yearly anchor in leap + non-leap; May 31 yearly anchor; strictly-after semantics. Depends: 1.
3. **Add `occurrencesToGenerate`** (WRITE) — pure fn `occurrencesToGenerate({ recurrence, anchorDate, createdAt, lastOccurrence?, today }): string[]`. Walks from `max(anchorDate, firstCandidateStrictlyAfter(createdAt))` forward via `nextOccurrenceAfter`, bounded by `lastOccurrence` below (exclusive when supplied) and `today` above (inclusive). Enforces the first-occurrence rule: no candidate ≤ `createdAt`'s ET date. Returns an ordered de-duplicated list of `YYYY-MM-DD`. Depends: 1.
4. **Unit tests for `occurrencesToGenerate`** (TEST) — empty list when freshly created and anchor hasn't re-hit; catch-up across multiple missed periods; respects `lastOccurrence` exclusive lower bound; respects `today` inclusive upper bound; first-occurrence rule for freshly-created templates (anchor day ≤ today's day in same month → no row this period); idempotent when `lastOccurrence = today`. Depends: 3.
5. **Add `materializeRecurring(db, today)` to `expense-access`** (WRITE) — iterates every template; for each, computes `lastOccurrence` as `max(expense.occurrenceDate where recurringId = template.id)`; calls `occurrencesToGenerate`; inserts one `expense` row per occurrence copying `description`, `amountCents`, `categoryId`, and the current tag set via `expenseTag` from `recurringTag`, with `date = occurrenceDate` and `recurringId` set. Catches unique-index violations on `(recurringId, occurrenceDate)` as no-ops. Aggregates per-template errors into a returned summary `{ generated: number; skipped: number; failed: Array<{ recurringId; error }> }`; never throws. Depends: 3, Issue 13 task 3.
6. **Unit/integration tests for `materializeRecurring`** (TEST) — idempotency (two successive runs produce identical DB state and second run's `generated` is 0); catch-up within `(lastOccurrence, today]`; bounded below by template creation; per-template error isolation (one bad template does not block others); preserves tag set copied at generation time even if the template's tags later change. Depends: 5.
8. **Render underline + ↻ badge for generated rows on [/expenses](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses:0:0-0:0)** (WRITE) — [src/routes/expenses/build-expenses.tsx](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses/build-expenses.tsx:0:0-0:0) extends the row renderer: when `recurringId` is non-null, wrap description in `<span class="underline">` and append a small `<span data-testid="expense-row-recurring-badge" aria-label="Recurring">↻</span>` immediately after. Requires `listExpenses` to surface `recurringId` in its row shape if it does not already — add the column to the select + return type. Depends: none.
9. **Unit test for `listExpenses` surfacing `recurringId`** (TEST) — `tests/expense-access.spec.ts` asserts `listExpenses` returns `recurringId` (null or the template id) per row. Depends: 8.
10. **Playwright e2e: 28th-shift across February** (TEST) — new spec `e2e-tests/recurring/05-cron-28th-shift.spec.ts`. Seeds a Monthly template anchored Jan 31; uses the existing clock hook (`/auth/set-clock`) to advance to Feb 15, Mar 1, Apr 1, May 1; after each advance calls `POST /test/run-cron` and asserts the generated `expense.date` values are exactly `2026-02-28`, `2026-03-31`, `2026-04-30` in order (and no earlier rows). Depends: 7, 8.
11. **Playwright e2e: idempotency + catch-up + first-occurrence rule** (TEST) — new spec `e2e-tests/recurring/06-cron-idempotency.spec.ts`. (a) Freshly created template anchored day 5 with clock set to day 10 same month → `run-cron` generates 0 rows (first-occurrence rule). (b) Advance clock across three missed months → `run-cron` generates exactly 3 rows, none earlier than creation. (c) Call `run-cron` again on the same clock → `generated=0` and DB byte-identical. Depends: 7, 8.
12. **Playwright e2e: ↻-badge + provenance preserved on edit** (TEST) — new spec `e2e-tests/recurring/07-generated-row-rendering.spec.ts`. Materializes at least one generated row, visits [/expenses](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses:0:0-0:0), asserts the row shows the underlined description + `expense-row-recurring-badge`. Edits the generated row's amount; on return to [/expenses](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses:0:0-0:0) asserts the badge/underline are still present (provenance preserved) and a subsequent `run-cron` does NOT re-insert that occurrence. Depends: 7, 8, 10.
13. **Playwright e2e: generated rows counted in search/filter/summary** (TEST) — new spec `e2e-tests/recurring/08-generated-in-queries.spec.ts`. Seeds a manual expense + materializes generated rows with the same category/tags/date-window; asserts [/expenses](file:///Users/chris/hacks/expenses/expense-log/src/routes/expenses:0:0-0:0) search, filter, and `/summary` counts include generated rows identically to manual rows. Depends: 7, 8.
14. **Update the wiki** (DOCUMENT) — new `recurrence.ts` full algorithm; `materializeRecurring`; `POST /test/run-cron`; list-page ↻-badge rendering; `listExpenses.recurringId`. Update `Notes/wiki/index.md` and append one `log.md` entry. Depends: 13.
15. **Code walkthrough** (CODE WALKTHROUGH) — `Notes/walkthroughs/14-recurrence-materialization/code-walkthrough/`. Depends: 14.
16. **UI walkthrough** (UI WALKTHROUGH) — `Notes/walkthroughs/14-recurrence-materialization/ui-walkthrough/` covering the ↻-badge, the clock + run-cron flow, and edit-preserves-provenance. Depends: 15.
17. **Final human review** (REVIEW). Depends: 16.

*Asked user a question*

*Edited relevant file*

### Planner Response

Wrote `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/14-recurrence-materialization-dev-cron.md` with 18 tasks. Task 5 split into core insert (task 5) and error-aggregation wrapper (task 6) per your selection.
