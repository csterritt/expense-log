# Tasks for #20: Resilient-submit happy path (expense entry form)

Parent issue: `Notes/issues/20-resilient-submit-happy-path.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. This issue covers the success/terminal path only — retry logic arrives in Issue 21.

## Tasks

### 1. RED: failing e2e for background submit + confirmation round-trip + in-flight lockout + JS-off fallback

**Type**: RED  
**Output**: A new Playwright spec under `e2e-tests/expenses/` adds failing coverage: (a) with JS enabled, submitting a valid expense sends the request via fetch and shows the normal success message via DOM swap (no full navigation flicker); (b) a submission that returns the confirmation page renders it in place and its confirm/cancel buttons also flow through the enhanced handler; (c) rapidly double-clicking submit fires only one submission (control disabled during flight); (d) with JS disabled, the form still submits natively with unchanged behaviour. Run and confirm the JS-on tests fail (module does not exist yet) before moving on.  
**Depends on**: Issue 19

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Follow the existing e2e patterns in `e2e-tests/expenses/` (sign-in helper, `data-testid` selectors). For the JS-disabled case use Playwright's ability to launch a context with JavaScript disabled; assert the native POST still lands on the normal success page.

---

### 2. GREEN: build `public/js/resilient-submit.js` (success/terminal path)

**Type**: GREEN  
**Output**: `public/js/resilient-submit.js` auto-initializes via a document-level `submit` listener using event delegation on forms carrying a specific `data-*` attribute (so it survives DOM swaps). On submit it serializes with `FormData` and sends via `fetch` (`credentials: 'same-origin'`, `redirect: 'follow'`), preserving existing CSRF behavior, sending the hidden `submissionKey` as-is. On a terminal non-error response it takes `response.text()`, swaps it into the document, and updates history to `response.url`. It disables the submit control with a "submitting…" state for the duration of the request. Init failures are swallowed (logged to `console.error` only) and must not block native submission; with JS off the form posts natively. Write only the minimum needed to turn the task-1 tests green.  
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match the vanilla-JS style of the existing `public/js/category-combobox.js` and `public/js/tag-chip-checkboxes.js` (no build step, no framework). Keep the module dependency-free.

---

### 3. GREEN: mark the entry + confirmation forms and wire the script

**Type**: GREEN  
**Output**: The expense entry form and the confirm-new-items form (`src/routes/expenses/expense-form.tsx`) carry the enabling `data-*` attribute, and the pages that render them include a `<script src="/js/resilient-submit.js" defer>` tag alongside the existing form scripts. The confirmation form is governed by the same delegated handler.  
**Depends on**: 2

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the existing `<script ... defer>` wiring seen in `src/routes/expenses/build-edit-expense.tsx` (`category-combobox.js`, `tag-chip-checkboxes.js`). Ensure the `data-*` attribute name is a shared constant / documented convention so Issue 24 can reuse it.

---

### 4. REFACTOR: tidy init and error-swallowing

**Type**: REFACTOR  
**Output**: With e2e green, tidy `resilient-submit.js` — clean separation of the delegated-listener setup, the send, and the success-swap; ensure the "submitting…" affordance is restored correctly on completion. Run the e2e and confirm it stays green.  
**Depends on**: 3

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here.

---

### 5. Human review: JS-on / JS-off verification

**Type**: REVIEW  
**Output**: A human confirms the manual checks in the issue: valid submit shows the success message via DOM swap; confirmation page renders in place and its buttons flow through the handler; double-click fires once; JS-off native submission behaves as before.  
**Depends on**: 4

---
