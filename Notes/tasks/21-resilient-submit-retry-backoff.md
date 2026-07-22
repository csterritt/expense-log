# Tasks for #21: Resilient-submit retry, backoff, and failure classification

Parent issue: `Notes/issues/21-resilient-submit-retry-backoff.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. Automatic retry is added for genuine infrastructure failures only; responses the server deliberately rendered are never retried.

## Tasks

### 1. RED: failing unit tables for the delay schedule + classification predicate

**Type**: RED  
**Output**: A new unit spec (under `tests/`) adds failing coverage for two not-yet-existing pure functions: (a) a backoff schedule — five total attempts (one initial + four retries), ×2 growth, full jitter, a hard cap — asserting attempt count, growth relationship, that each delay lies within its full-jitter bounds, and that delays never exceed the cap; (b) a classification predicate — an attempt is **retryable** when the fetch rejects (network/transport), the client-side timeout fires, or the final status is `>= 500`; everything else is **terminal** (2xx confirmation page, a followed-303 success/validation re-render, any 4xx). Run and confirm the tests fail before moving on.  
**Depends on**: Issue 20

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Because these are pure functions, extract them so they are importable by both the unit test and the browser module without a DOM. For jitter, seed or inject the randomness so bounds are assertable deterministically. Match the vitest style of the existing `tests/*.spec.ts`.

---

### 2. GREEN: implement pure schedule + classifier and add retry/backoff/timeout to the module

**Type**: GREEN  
**Output**: The pure attempt/delay-schedule function and the classification predicate are implemented and consumed by `public/js/resilient-submit.js`. The module wraps each attempt with an `AbortController` client-side timeout, classifies the result, and on a retryable failure waits the scheduled capped-jittered delay before the next attempt, up to five total attempts. Base delay, growth, jitter, cap, timeout, and max-attempts are file-level constants using the project's `// PRODUCTION:UNCOMMENT` (real) / `// PRODUCTION:REMOVE` (tiny, for tests) convention. Validation/conflict 303 re-renders and 4xx are terminal and shown immediately (Issue 20 behaviour). Write only the minimum needed to turn the task-1 tests green.  
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the shared `data-*` attribute and success-swap logic from Issue 20. Keep the pure functions dependency- and DOM-free so the unit tests import them directly. Follow the existing `// PRODUCTION:UNCOMMENT` / `// PRODUCTION:REMOVE` constant convention seen elsewhere in the codebase (e.g. `src/constants.ts`).

---

### 3. RED: failing e2e for transient-5xx-then-success and immediate validation error

**Type**: RED  
**Output**: A new Playwright spec under `e2e-tests/expenses/` adds failing coverage: (a) forcing a transient 5xx on the expense POST (via the existing forced-DB-error hook) causes the module to retry with growing delays and, once the failure clears, land on the normal success page; (b) an invalid expense shows the validation error immediately with no retry/backoff delay. Run and confirm the retry test fails before moving on.  
**Depends on**: 2

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the existing forced-DB-error mechanism (`handle-set-db-failures` / the `DB_FAIL_COUNT` cookie) to produce 5xx responses, matching how other e2e specs set forced failures. Rely on the tiny `// PRODUCTION:REMOVE` test delays so the suite stays fast.

---

### 4. GREEN: make the retry/validation e2e pass

**Type**: GREEN  
**Output**: The retry loop and classifier are wired so the task-3 e2e passes: a transient 5xx is retried and succeeds; a validation 303 re-render is shown immediately with no retry. Write only the minimum needed to turn the e2e green.  
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`.

---

### 5. REFACTOR: tidy the retry loop

**Type**: REFACTOR  
**Output**: With unit and e2e suites green, tidy the retry loop so the pure schedule/classifier, the timeout wrapper, and the send/swap are clearly separated. Run both suites and confirm they stay green.  
**Depends on**: 4

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here.

---

### 6. Human review: forced-5xx retry verification

**Type**: REVIEW  
**Output**: A human confirms the manual checks in the issue: a forced 5xx is retried with growing delays and recovers to the success page once cleared; a validation error appears immediately with no backoff delay.  
**Depends on**: 5

---
