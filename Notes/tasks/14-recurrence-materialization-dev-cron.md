# Tasks for #14: Recurrence algorithm, materialization, and dev cron route

Parent issue: `Notes/issues/14-recurrence-materialization-dev-cron.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Extend `nextOccurrenceAfter` to Quarterly + Yearly

**Type**: WRITE
**Output**: `src/lib/recurrence.ts` replaces the Issue 13 monthly-only stub: `nextOccurrenceAfter({ recurrence, anchorDate, after })` now supports `'Quarterly'` (every 3 months from the anchor month, same anchor day with 28th-shift) and `'Yearly'` (same month + day as the anchor, with 28th-shift — notably Feb 29 anchor → Feb 28 in non-leap years; May 31 anchor → May 31 in any year). The 28th-shift rule applies uniformly: any anchor day in {29, 30, 31} that does not exist in the target month becomes 28. Strictly-after semantics preserved (when the candidate equals `after`, advance one period). Inputs continue to validate as `YYYY-MM-DD`.
**Depends on**: Issue 13 task 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Keep the module HTTP-agnostic and dependency-free beyond the existing `et-date` helpers. Pure calendar-field arithmetic — do not lean on timezone math here (the caller passes ET-anchored `YYYY-MM-DD` strings).

---

### 2. Unit tests for `nextOccurrenceAfter` full coverage

**Type**: TEST
**Output**: `tests/recurrence.spec.ts` adds Quarterly + Yearly coverage: anchor days 1, 15, 28, 29, 30, 31; Yearly Feb 29 anchor in a leap year (returns Feb 29) and a non-leap year (returns Feb 28); Yearly May 31 anchor (returns May 31 every year); Quarterly anchor 31 stepping Jan→Apr→Jul→Oct (Apr → Apr 30, Jul → Jul 31, Oct → Oct 31); strictly-after semantics for each recurrence (input `after = anchor` returns the next period). Existing Monthly tests remain untouched.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Pure unit tests — no DB harness. Match the structure of the existing Monthly tests in the same spec.

---

### 3. Add `occurrencesToGenerate`

**Type**: WRITE
**Output**: `src/lib/recurrence.ts` exports `occurrencesToGenerate({ recurrence, anchorDate, createdAt, lastOccurrence, today }: { recurrence: 'Monthly' | 'Quarterly' | 'Yearly'; anchorDate: string; createdAt: string; lastOccurrence?: string; today: string }): string[]`. `createdAt` and `today` are `YYYY-MM-DD` strings (ET-anchored). Algorithm:

1. Compute `floor` = `lastOccurrence` when supplied, otherwise the day strictly before the first candidate after `createdAt` (i.e. `nextOccurrenceAfter({ recurrence, anchorDate, after: createdAt })` minus zero — see step 2).
2. Walk via `nextOccurrenceAfter({ recurrence, anchorDate, after: cursor })` starting from `cursor = floor`, accumulating each result that is `> floor` AND `<= today` AND `> createdAt` (first-occurrence rule: never generate on or before the template's creation date).
3. Stop when the next candidate exceeds `today`. Return the accumulated list (already in ascending order; no duplicates by construction).

Throws if any input is not a valid `YYYY-MM-DD`. The function is pure — no DB / HTTP / clock access.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Keep the module HTTP-agnostic. Document the first-occurrence rule and the `lastOccurrence`-exclusive lower bound in JSDoc on the export.

---

### 4. Unit tests for `occurrencesToGenerate`

**Type**: TEST
**Output**: `tests/recurrence.spec.ts` covers `occurrencesToGenerate`: empty list when freshly created today and anchor is later this month (first-occurrence rule); empty list when `lastOccurrence === today`; catch-up returning N entries when `today` is N periods past `lastOccurrence`; respects `lastOccurrence` exclusive lower bound (a candidate equal to `lastOccurrence` is excluded); respects `today` inclusive upper bound (a candidate equal to `today` IS included); never returns a candidate `<= createdAt` even when `lastOccurrence` is absent; works identically for Monthly, Quarterly, and Yearly.
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Pure unit tests.

---

### 5. Add `materializeRecurring` core insert logic (throws on errors)

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports an internal helper `materializeOneRecurring(db, template, today)` (not yet exported as `materializeRecurring`) that, for a single resolved recurring template row (already joined with its current tag id list), computes `lastOccurrence` as `max(expense.occurrenceDate WHERE recurringId = template.id)`, calls `occurrencesToGenerate`, and inserts one `expense` row per occurrence inside a single drizzle transaction per occurrence. Each inserted row copies `description`, `amountCents`, `categoryId` from the template, sets `date = occurrenceDate`, sets `recurringId = template.id`, and inserts one `expenseTag` row per id in the template's current tag set. Catches the unique-index violation on `(recurringId, occurrenceDate)` and treats it as a no-op (counted as `skipped`). Returns `{ generated: number; skipped: number }` for that template. Throws any other error.
**Depends on**: 3, Issue 13 task 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the drizzle transaction shape from `createExpenseWithTags`. Keep the helper HTTP-agnostic. Do NOT yet aggregate per-template errors here — that lands in task 6.

---

### 6. Wrap with error aggregation and summary

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports the public `materializeRecurring(db, today: string): Promise<Result<{ generated: number; skipped: number; failed: Array<{ recurringId: string; error: string }> }, Error>>`. Loads every recurring template (with its current tag id list — reuse `listRecurring` or extract a leaner internal query), iterates them, calls the task-5 helper inside a per-template `try/catch`, and aggregates the totals. Per-template errors are collected into `failed` (with a friendly message) and never propagated; the loop always completes for the remaining templates. Wrapped with `withRetry` only at the outer "load templates" step, not around the per-template inserts (their idempotency is handled inside).
**Depends on**: 5

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match the drizzle / `Result` / `withRetry` patterns used by the surrounding helpers. Keep the helper HTTP-agnostic — `today` is a string, not a clock call.

---

### 7. Unit / integration tests for `materializeRecurring`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers: idempotency (two successive runs on the same `today` yield identical DB state and the second call's `generated === 0`, `skipped > 0`); catch-up across multiple missed periods within `(lastOccurrence, today]`; first-occurrence rule respected when no past generated rows exist; bounded-below-by-creation when no `lastOccurrence`; per-template error isolation (force a failure on one template — e.g. by deleting its category to violate FK — and assert other templates still process and the bad one shows up in `failed`); the inserted `expense` rows carry `recurringId = template.id`, `occurrenceDate = generated YYYY-MM-DD`, and the **template's current** tag set at generation time (mutating `recurringTag` after a run does not retroactively alter previously-generated rows).
**Depends on**: 6

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness used by the other `expense-access` helper tests.

---

### 8. Add `POST /test/run-cron` dev route

**Type**: WRITE
**Output**: A new handler in `src/routes/test/` (new file `run-cron.ts` or extension of an existing test-routes module — pick the smaller delta) registers `POST /test/run-cron`, guarded by `isTestRouteEnabled`, marked `// PRODUCTION:REMOVE`, signed-in only. The handler calls `materializeRecurring(db, todayEt(getCurrentTime(c)))` and returns the `{ generated, skipped, failed }` summary as JSON. Wires into `src/index.ts` next to the other `// PRODUCTION:REMOVE` test routers.
**Depends on**: 6

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use `getCurrentTime(c)` so the existing clock-delta cookie (set via `/auth/set-clock`) drives the materialization clock — that is the deterministic hook the e2e tests rely on. Mark the file / handler / router import with `// PRODUCTION:REMOVE`.

---

### 9. Render underline + ↻ badge for generated rows on `/expenses`

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` extends the row renderer so that when `row.recurringId` is non-null, the description cell renders the description text inside `<span class="underline">…</span>` and immediately appends `<span data-testid="expense-row-recurring-badge" aria-label="Recurring" title="Recurring">↻</span>` (with a small left margin via Tailwind, e.g. `ml-1`). When `recurringId` is null the row renders exactly as before. If `listExpenses` does not yet surface `recurringId` on its row shape, this task also extends `listExpenses` in `src/lib/db/expense-access.ts` to add `recurringId: string | null` to the select + return type.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match DaisyUI / Tailwind conventions already in the row. The badge must be a real `<span>`, not an `<img>` or icon font, so the no-JS path renders identically.

---

### 10. Unit test for `listExpenses` surfacing `recurringId`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` adds coverage asserting `listExpenses` returns each row with a `recurringId` field equal to `null` for manual expenses and equal to the seeded template id for generated expenses.
**Depends on**: 9

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness.

---

### 11. Playwright e2e: 28th-shift across February

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/05-cron-28th-shift.spec.ts` signs in, seeds a Monthly recurring template anchored on a Jan 31 within the test year. Uses the existing `/auth/set-clock` route (clock-delta cookie) to advance the clock to a date in mid-Feb, then to Mar 1, then Apr 1, then May 1. After each advance, `POST /test/run-cron` and assert the response summary; after all advances, visit `/expenses` and assert the generated rows' `expense-row-date` values are exactly the Feb 28, Mar 31, and Apr 30 of the test year, in ascending order, each rendered with the underlined description and `expense-row-recurring-badge`.
**Depends on**: 8, 9

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed / clock helpers from `e2e-tests/support/`. Follow the structure of existing recurring e2e specs from Issue 13.

---

### 12. Playwright e2e: idempotency + catch-up + first-occurrence rule

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/06-cron-idempotency.spec.ts` exercises three sub-flows in one signed-in session:

1. **First-occurrence**: create a Monthly template anchored on day 5; set the clock to day 10 of the same month; `POST /test/run-cron`; assert summary `generated=0` and no rows on `/expenses`.
2. **Catch-up**: starting from a fresh template anchored several months ago, advance the clock past three anchor hits; `POST /test/run-cron`; assert `generated=3` and three rows visible on `/expenses` with the correct dates.
3. **Idempotency**: call `POST /test/run-cron` again on the same clock; assert `generated=0`, `skipped >= 3`, and the DB row count on `/expenses` is unchanged.
**Depends on**: 8, 9

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed / clock helpers.

---

### 13. Playwright e2e: ↻-badge + provenance preserved on edit

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/07-generated-row-rendering.spec.ts` materializes at least one generated row via clock + run-cron, visits `/expenses`, and asserts the row shows the underlined description plus `expense-row-recurring-badge` (and that manual-row peers do NOT show the badge). Clicks edit on the generated row, changes the amount, saves; on return to `/expenses` asserts the badge / underline are still present (i.e. `recurringId` was preserved across the edit). Calls `POST /test/run-cron` again on the same clock; asserts no new row appeared for that occurrence (the unique index on `(recurringId, occurrenceDate)` blocked it).
**Depends on**: 8, 9, 11

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed / clock helpers. Reuse the Issue 08 expense-edit selectors.

---

### 14. Playwright e2e: generated rows counted in search/filter/summary

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/08-generated-in-queries.spec.ts` seeds a manual expense and materializes generated rows sharing the same category and at least one tag with the manual expense, all within the default date range. Asserts: `/expenses` text-search by a substring of the shared description returns both manual and generated rows; `/expenses` category filter returns both; `/expenses` tag filter returns both; `/summary` per-category and per-tag totals include the cents from generated rows identically to manual rows.
**Depends on**: 8, 9

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed / clock helpers. Reuse the search/filter/summary selectors from Issues 11 / 12 e2e specs.

---

### 15. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the full `nextOccurrenceAfter` (Monthly / Quarterly / Yearly with 28th-shift) and the new `occurrencesToGenerate` in `src/lib/recurrence.ts`; the new `materializeRecurring` helper and its summary shape; the dev-only `POST /test/run-cron` route; the `/expenses` row-rendering changes (underline + ↻ badge); the `recurringId` column added to `listExpenses`. Update `Notes/wiki/index.md` and append one `## [YYYY-MM-DD] ingest | Issue 14: recurrence engine + materialization + dev cron` entry to `log.md`.
**Depends on**: 14

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link to Issue 13 (recurring CRUD) and Issue 15 (scheduled cron + Pushover).

---

### 16. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/14-recurrence-materialization/code-walkthrough/` covering: the recurrence module (full algorithm + 28th-shift + first-occurrence rule); the `materializeOneRecurring` core insert + the public `materializeRecurring` aggregator; the `POST /test/run-cron` route; the `/expenses` row-rendering tweak; the `listExpenses` `recurringId` plumbing.
**Depends on**: 15

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 17. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A walkthrough under `Notes/walkthroughs/14-recurrence-materialization/ui-walkthrough/` showing: a manual `/auth/set-clock` advance + `POST /test/run-cron` cycle; `/expenses` rendering generated rows with the underline + ↻ badge alongside manual rows; the 28th-shift result on a February-spanning advance; an edit of a generated row preserving the badge; and a `/summary` view that includes the generated rows' cents.
**Depends on**: 16

Run `uvx showboat --help` and `uvx rodney --help` first to confirm current flags, then generate into the new directory.

---

### 18. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 17

---
