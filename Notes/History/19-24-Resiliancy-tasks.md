# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

read through @[Notes/skills/issue-to-tasks/SKILL.md] and then the most recent files in Notes/issues (19-submission-idempotency-backbone.md
20-resilient-submit-happy-path.md
21-resilient-submit-retry-backoff.md
22-errorpage-html-detection.md
23-resilient-submit-exhaustion-ux.md
24-resilient-submit-rollout-all-forms.md) and generate tasks for them

### Planner Response

I'll read the skill file and the six issue files.

*Viewed [SKILL.md](file:///Users/chris/hacks/expenses/expense-log/Notes/skills/issue-to-tasks/SKILL.md) *

*Viewed [19-submission-idempotency-backbone.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/19-submission-idempotency-backbone.md) *

*Viewed [20-resilient-submit-happy-path.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/20-resilient-submit-happy-path.md) *

*Viewed [21-resilient-submit-retry-backoff.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/21-resilient-submit-retry-backoff.md) *

*Viewed [22-errorpage-html-detection.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/22-errorpage-html-detection.md) *

*Viewed [23-resilient-submit-exhaustion-ux.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/23-resilient-submit-exhaustion-ux.md) *

*Viewed [24-resilient-submit-rollout-all-forms.md](file:///Users/chris/hacks/expenses/expense-log/Notes/issues/24-resilient-submit-rollout-all-forms.md) *

### Planner Response

I've read the skill and all six issues. Now let me explore the codebase and existing task-file conventions.

*Listed directory [tasks](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks) *

*Viewed [schema.ts](file:///Users/chris/hacks/expenses/expense-log/src/db/schema.ts) *

### Planner Response

Let me review an existing task file for format conventions and explore relevant code.

*Viewed [13-recurring-crud.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/13-recurring-crud.md) *

*Found code context*

### Planner Response

Let me read the PRD's relevant sections and key infra: ULID/id generation, `withRetry`, forced-db-error hook, and how public JS is wired.

*Grep searched codebase*

*Found code context*

### Planner Response

Let me check the forced-DB-error hook, how public JS is wired into pages, and the most recent task file's type conventions.

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md) *

*Found code context*

### Planner Response

I've read the skill, all six issues, the parent PRD sections, and the relevant code (`expense-post-handler.ts`, `expense-confirm-post-handler.ts`, `expense-form.tsx`, `db-helpers.ts` `withRetry`, [schema.ts](file:///Users/chris/hacks/expenses/expense-log/src/db/schema.ts:0:0-0:0), ULID usage, the forced-DB-error test hook, and how `public/js/*.js` is wired via `<script defer>`). The most recent task file (`18-...`) uses the **RED/GREEN/REFACTOR** convention from the current [SKILL.md](file:///Users/chris/hacks/expenses/expense-log/Notes/skills/issue-to-tasks/SKILL.md:0:0-0:0), so I'll follow that.

Per the skill (step 4), here are the proposed task lists for each issue. I'll write the six files after you approve.

# Issue 19 — Submission idempotency backbone

**1. MIGRATE** — Add `submissionKey` table to [src/db/schema.ts](file:///Users/chris/hacks/expenses/expense-log/src/db/schema.ts:0:0-0:0) (`key` ULID PK, `userId` FK→`user` ON DELETE CASCADE, `outcome` text, `createdAt`) + generate Drizzle migration. *Depends on: none*
**2. RED** — Failing integration tests for `withIdempotency` (fresh key commits once; replayed key returns stored outcome + inserts nothing; validation-failed/absent/malformed key leaves no ledger row). *Depends on: 1*
**3. GREEN** — Build `src/lib/submission-idempotency.ts` `withIdempotency(db,{key,userId,run})`, recording the key in the same transaction as the write. *Depends on: 2*
**4. GREEN** — Render server-generated hidden `submissionKey` (ULID) on the entry form and round-trip it through the confirmation page's hidden fields. *Depends on: 3*
**5. GREEN** — Wire the direct-create and confirm-create handlers through `withIdempotency`, keyed off the submitted `submissionKey`. *Depends on: 3, 4*
**6. GREEN** — Opportunistic prune of ledger rows older than a short TTL (~24h). *Depends on: 3*
**7. REFACTOR** — Tidy the module/handler wiring while keeping the suite green. *Depends on: 5, 6*
**8. DOCUMENT** — Wiki note for the idempotency ledger + module contract. *Depends on: 7*
**9. REVIEW** — Manual curl-replay verification per the issue. *Depends on: 8*

# Issue 20 — Resilient-submit happy path

**1. RED** — Playwright e2e (JS on): valid submit renders success via DOM swap; confirmation-page round-trip flows through the handler; double-click fires once; JS-off native fallback smoke test. *Depends on: Issue 19*
**2. GREEN** — Build `public/js/resilient-submit.js` (document-level `submit` delegation on a `data-*` attribute; `FormData` + `fetch` `same-origin`/`follow`; success DOM swap + `history` update; in-flight disable). *Depends on: 1*
**3. GREEN** — Mark entry + confirmation forms with the enabling `data-*` attribute and wire the `<script>`. *Depends on: 2*
**4. REFACTOR** — Tidy init/error-swallowing while keeping e2e green. *Depends on: 3*
**5. REVIEW** — Manual JS-on/JS-off verification. *Depends on: 4*

# Issue 21 — Retry, backoff & failure classification

**1. RED** — Unit tables for the pure schedule (5 attempts, ×2 growth, full-jitter bounds, cap) + classification predicate (network/timeout/5xx→retry; 2xx/303/4xx→terminal). *Depends on: Issue 20*
**2. GREEN** — Extract pure schedule + classifier; add `AbortController` timeout + capped-jittered backoff to `resilient-submit.js`; delays as file-level constants using `// PRODUCTION:UNCOMMENT`/`// PRODUCTION:REMOVE`. *Depends on: 1*
**3. RED** — Playwright e2e: transient 5xx (forced-DB-error hook) then success; validation error shown immediately with no retry. *Depends on: 2*
**4. GREEN** — Make the e2e pass (wire classifier into the submit loop). *Depends on: 3*
**5. REFACTOR** — Tidy; keep unit + e2e green. *Depends on: 4*
**6. REVIEW** — Manual forced-5xx verification. *Depends on: 5*

# Issue 22 — `ErrorPage.html` (HTTP 200) detection

**1. RED** — Unit test: response URL resolving to shared `ErrorPage.html` path (case-insensitive `pathname`) classifies as retryable even at status 200; identity check runs before terminal render. *Depends on: Issue 21*
**2. GREEN** — Add shared `ErrorPage.html` path constant (single source for client + tests); extend classifier. *Depends on: 1*
**3. RED** — Playwright e2e via network interception fulfilling POST with a 200 `ErrorPage.html`; assert retry then success once cleared. *Depends on: 2*
**4. GREEN** — Make the e2e pass. *Depends on: 3*
**5. REVIEW** — Manual devtools-override verification. *Depends on: 4*

# Issue 23 — Exhaustion UX (values preserved)

**1. RED** — Playwright e2e: five consecutive failures → inline error banner (`data-testid`), submit re-enabled, no navigation, all fields/chips/new-tag/new-category text preserved; manual resubmit after clearing succeeds. *Depends on: Issue 22*
**2. GREEN** — After the fifth failure, stop retrying, re-enable submit, reveal recoverable error banner in-place. *Depends on: 1*
**3. REFACTOR** — Tidy exhaustion path; keep green. *Depends on: 2*
**4. REVIEW** — Manual full-form exhaustion verification. *Depends on: 3*

# Issue 24 — Roll out to all mutation forms

**1. GREEN** — Mark expense edit/delete forms with the `data-*` attribute + hidden `submissionKey`; wire their committing handlers through `withIdempotency`. *Depends on: Issue 23*
**2. GREEN** — Same for category create/rename/merge-confirm/delete. *Depends on: 1*
**3. GREEN** — Same for tag create/rename/merge-confirm/delete. *Depends on: 2*
**4. GREEN** — Same for recurring create/edit/delete. *Depends on: 3*
**5. RED** — Playwright e2e per family: transient-failure-then-success + same-key replay = no duplicate effect; integration tests each handler routes through `withIdempotency`; assert auth forms are NOT enhanced. *Depends on: 4*
**6. GREEN** — Make the rollout e2e/integration tests pass. *Depends on: 5*
**7. REFACTOR** — Tidy shared wiring. *Depends on: 6*
**8. DOCUMENT** — Wiki update: resilient-submit + idempotency applies-to list. *Depends on: 7*
**9. REVIEW** — Manual per-family verification. *Depends on: 8*

A few notes for your review:

- **RED/GREEN e2e pairing** — For issues 20/21/22/24 I paired failing e2e (RED) with a make-it-pass (GREEN) step. Some teams prefer one combined WRITE step; say the word if you'd rather merge.
- **Type labels** — I skipped `CODE WALKTHROUGH` since the skill lists it as optional and none of these issues call for it. I can add walkthrough tasks if you want.

*Asked user a question*

### Planner Response

Writing all six task files now.

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

### Planner Response

All six task files created in [Notes/tasks/](file:///Users/chris/hacks/expenses/expense-log/Notes/tasks:0:0-0:0), one per issue, following the current [SKILL.md](file:///Users/chris/hacks/expenses/expense-log/Notes/skills/issue-to-tasks/SKILL.md:0:0-0:0) template and the RED/GREEN/REFACTOR convention used by the most recent task file.

# Files written

- `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/19-submission-idempotency-backbone.md` — 9 tasks (MIGRATE → RED → GREEN×4 → REFACTOR → DOCUMENT → REVIEW)
- `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/20-resilient-submit-happy-path.md` — 5 tasks
- `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/21-resilient-submit-retry-backoff.md` — 6 tasks
- `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/22-errorpage-html-detection.md` — 5 tasks
- `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/23-resilient-submit-exhaustion-ux.md` — 4 tasks
- `@/Users/chris/hacks/expenses/expense-log/Notes/tasks/24-resilient-submit-rollout-all-forms.md` — 9 tasks

# Notes

- Each file uses the template's `Type` / `Output` / `Depends on` fields, includes the coding-standards paragraph on RED/GREEN tasks, and describes intent (no code snippets).
- Grounded in the real codebase: `withIdempotency` mirrors `withRetry`/transaction patterns in `src/lib/db/`, the `submissionKey` FK mirrors `session`, the client module follows the vanilla `public/js/*.js` style, and retries reuse the existing forced-DB-error hook plus the `// PRODUCTION:UNCOMMENT`/`// PRODUCTION:REMOVE` constant convention.
- I did not modify any issue or the PRD.