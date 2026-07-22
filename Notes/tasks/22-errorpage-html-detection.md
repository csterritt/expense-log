# Tasks for #22: `ErrorPage.html` (HTTP 200) host-error detection

Parent issue: `Notes/issues/22-errorpage-html-detection.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. The host serves its fallback error page with HTTP 200 when the Worker crashes or is unreachable, so it cannot be detected by status code or a cooperating header — the response identity is the signal.

## Tasks

### 1. RED: failing unit test for `ErrorPage.html` identity classification

**Type**: RED  
**Output**: The resilient-submit classifier unit spec (from Issue 21) adds failing coverage: a final response whose URL resolves to the known `ErrorPage.html` path (case-insensitive `pathname` match) is classified **retryable** even though its status is 200, and this identity check runs before the "terminal, render as-is" path so a 200 `ErrorPage.html` is never mistaken for a legitimate rendered page. Run and confirm the new cases fail before moving on.  
**Depends on**: Issue 21

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Extend the existing pure classifier tests; assert both the positive match (retryable) and that a legitimate 200 page at a different path stays terminal.

---

### 2. GREEN: add the shared path constant and extend the classifier

**Type**: GREEN  
**Output**: A single shared `ErrorPage.html` path constant is defined as the one source of truth, referenced by both `public/js/resilient-submit.js` and the tests. The classification predicate is extended so an attempt is retryable when the final response URL's `pathname` matches that constant case-insensitively, with the identity check ordered before the terminal render path. Write only the minimum needed to turn the task-1 tests green.  
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Ensure the constant is genuinely shared (imported/required by both client and test) rather than duplicated. Keep the classifier pure and DOM-free.

---

### 3. RED: failing e2e using network interception to serve a 200 `ErrorPage.html`

**Type**: RED  
**Output**: A new Playwright spec under `e2e-tests/expenses/` adds failing coverage using request interception to fulfill the expense POST with a 200 response whose URL resolves to the `ErrorPage.html` path; assert the submission is treated as a failure and retried (not swapped in as "success"), and that once interception is removed a subsequent attempt succeeds and shows the normal success page. Run and confirm it fails before moving on.  
**Depends on**: 2

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Use Playwright route interception to fulfill the POST; reference the same shared path constant so the test and client agree on the detection path.

---

### 4. GREEN: make the `ErrorPage.html` e2e pass

**Type**: GREEN  
**Output**: The module treats an intercepted 200 `ErrorPage.html` response as retryable and, once interception is cleared, lands on the normal success page — the task-3 e2e passes. Write only the minimum needed to turn it green.  
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`.

---

### 5. Human review: devtools-override verification

**Type**: REVIEW  
**Output**: A human confirms the manual checks in the issue: overriding the POST to resolve to a 200 `ErrorPage.html` causes a retry (not an error-page swap); clearing the override mid-backoff lands on the normal success page.  
**Depends on**: 4

---
