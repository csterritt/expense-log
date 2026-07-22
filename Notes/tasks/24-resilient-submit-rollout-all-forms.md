# Tasks for #24: Roll out resilient submit + idempotency to all mutation forms

Parent issue: `Notes/issues/24-resilient-submit-rollout-all-forms.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. This extends the resilient-submit enhancement and idempotency backbone — proven on the expense entry/confirmation forms in Issues 19–23 — across every remaining signed-in mutation form. Auth forms (sign-in, sign-up, password reset) are explicitly excluded (PRD _Out of Scope_).

## Tasks

### 1. GREEN: roll out to expense edit + delete forms

**Type**: GREEN  
**Output**: The expense edit and delete forms carry the enabling `data-*` attribute and render a server-generated hidden `submissionKey` (ULID), and their committing handlers run through `withIdempotency` (Issue 19), keyed off the submitted `submissionKey`, so a replayed request replays the original outcome instead of writing again.  
**Depends on**: Issue 23

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the shared `data-*` attribute constant and hidden-`submissionKey` rendering established in Issues 19–20 (`src/routes/expenses/expense-form.tsx`, `build-edit-expense.tsx`). Wrap only the actual commit calls in the edit/delete handlers; mint the key server-side on the GET render.

---

### 2. GREEN: roll out to category create / rename / merge-confirm / delete

**Type**: GREEN  
**Output**: The category create, rename, merge-confirm, and delete forms carry the `data-*` attribute + hidden `submissionKey`, and each committing handler routes through `withIdempotency`.  
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the category routes/handlers (`src/routes/build-categories.ts` and its access layer). Reuse the same key-render + `withIdempotency` pattern from task 1; keep the `<script src="/js/resilient-submit.js" defer>` wiring consistent.

---

### 3. GREEN: roll out to tag create / rename / merge-confirm / delete

**Type**: GREEN  
**Output**: The tag create, rename, merge-confirm, and delete forms carry the `data-*` attribute + hidden `submissionKey`, and each committing handler routes through `withIdempotency`.  
**Depends on**: 2

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the tag routes/handlers (`src/routes/build-tags.ts` and `src/lib/db/tag-access.ts`). Reuse the task-1/2 pattern.

---

### 4. GREEN: roll out to recurring create / edit / delete

**Type**: GREEN  
**Output**: The recurring create, edit, and delete forms carry the `data-*` attribute + hidden `submissionKey`, and each committing handler routes through `withIdempotency`.  
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the recurring routes/handlers (`src/routes/build-recurring.ts`, `src/routes/recurring/build-create-recurring.ts`, `build-edit-recurring.ts`). Reuse the task-1/2/3 pattern; the confirm-new-items page for recurring already round-trips hidden fields via `renderConfirmNewItems`.

---

### 5. RED: failing e2e + integration coverage across every form family

**Type**: RED  
**Output**: New Playwright specs (under the relevant `e2e-tests/` folders) and integration tests add failing coverage: for at least one form in each family (expense edit/delete, categories, tags, recurring) — a transient-failure-then-success path, and a same-key replay producing no duplicate row/merge/delete side effect. Integration tests assert each listed committing handler routes through `withIdempotency`. An e2e assertion confirms auth forms (sign-in, sign-up, password reset) are NOT enhanced by resilient submit. Run and confirm the new coverage fails before completing the wiring.  
**Depends on**: 4

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the forced-DB-error mechanism for transient failures and the server-side replay approach from Issue 19 for the duplicate-effect assertions. Follow existing e2e patterns per family folder.

---

### 6. GREEN: make the rollout coverage pass

**Type**: GREEN  
**Output**: Any gaps surfaced by task 5 are closed so every family passes: transient-failure-then-success works, same-key replay writes no duplicate, and auth forms remain unenhanced. Value-preservation on exhaustion (Issue 23) is confirmed for these forms via their existing sticky-value / flash re-render mechanisms. Write only the minimum needed to turn task-5 coverage green.  
**Depends on**: 5

Read and follow the project coding standards in `Notes/skills/AGENTS.md`.

---

### 7. REFACTOR: consolidate shared rollout wiring

**Type**: REFACTOR  
**Output**: With all suites green, factor any duplicated `submissionKey`-render / handler-wrapping logic into a shared helper used by every family, ensuring the `data-*` attribute and script wiring are applied uniformly. Run the suites and confirm they stay green.  
**Depends on**: 6

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here.

---

### 8. Document the applies-to rollout in the wiki

**Type**: DOCUMENT  
**Output**: The resilient-submit / idempotency wiki page (started in Issue 19) is updated with the full applies-to list — expense create/edit/delete + confirmation, category create/rename/merge/delete, tag create/rename/merge/delete, recurring create/edit/delete — and the explicit auth-forms exclusion.  
**Depends on**: 7

---

### 9. Human review: per-family verification

**Type**: REVIEW  
**Output**: A human confirms the manual checks in the issue: for each form family, a transient failure then success yields the normal outcome, and a same-key committing replay produces no duplicate row/merge/delete side effect.  
**Depends on**: 8

---
