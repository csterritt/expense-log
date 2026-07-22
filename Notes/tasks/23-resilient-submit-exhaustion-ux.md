# Tasks for #23: Resilient-submit exhaustion UX (values preserved)

Parent issue: `Notes/issues/23-resilient-submit-exhaustion-ux.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. This is the end-of-the-line behaviour on the expense entry form when all retries fail.

## Tasks

### 1. RED: failing e2e for exhaustion banner with all values preserved

**Type**: RED  
**Output**: A new Playwright spec under `e2e-tests/expenses/` adds failing coverage: force the expense POST to fail on every attempt (forced-DB-error hook and/or a persistent 200 `ErrorPage.html` override); fill the form fully — description, amount, category, selected tag chips, a new-tag entry, and a new-category name — then submit. After retries exhaust, assert: a descriptive recoverable error banner (with a `data-testid`) appears; the submit control is re-enabled; no navigation occurred; and every field, chip selection, new-tag text, and new-category text is still populated. Then clear the failure, resubmit, and assert the normal success page. Run and confirm it fails before moving on.  
**Depends on**: Issue 22

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the forced-DB-error mechanism and/or the Issue 22 interception approach to guarantee five consecutive failures. Use the tiny `// PRODUCTION:REMOVE` test delays so the five attempts complete quickly. Follow the project's `data-testid` conventions for the banner selector.

---

### 2. GREEN: implement the exhaustion UX

**Type**: GREEN  
**Output**: `public/js/resilient-submit.js` stops retrying after the fifth failed attempt, re-enables the submit control, and reveals a descriptive, recoverable inline error banner (with a `data-testid`) on the form without navigating. Because the page never navigated, every entered value — text fields, selected tag chips, new-tag text, and new-category text — remains exactly as the user left it, ready for a manual retry. The banner message tells the user the submission could not be completed and to try again later. Write only the minimum needed to turn the task-1 e2e green.  
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reveal/insert the banner without replacing the form DOM (so live field/chip state is preserved); reuse the max-attempts constant from Issue 21. Keep the banner markup and `data-testid` consistent with existing error affordances in the app.

---

### 3. REFACTOR: tidy the exhaustion path

**Type**: REFACTOR  
**Output**: With the suite green, tidy the exhaustion branch so banner display, control re-enable, and the "stop retrying" decision are cleanly separated from the success-swap path. Run the suite and confirm it stays green.  
**Depends on**: 2

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here.

---

### 4. Human review: full-form exhaustion verification

**Type**: REVIEW  
**Output**: A human confirms the manual checks in the issue: with the POST failing on every attempt, a fully-filled form (including chips, new-tag, and new-category text) shows the error banner, keeps the submit control enabled, preserves every value, and succeeds on a manual resubmit after the failure is cleared.  
**Depends on**: 3

---
