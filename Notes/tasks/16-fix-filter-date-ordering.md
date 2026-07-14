# Tasks for #16: Fix filter date ordering

Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Medium: Expense list filter accepts reversed date ranges without validation

- **Location**: `src/lib/expense-validators.ts`, `src/routes/expenses/expense-get-handler.ts`
- **Issue**: `parseExpenseListFilters` validates `from` and `to` independently but does not reject `from > to`. `parseSummaryQuery` handles this correctly at `src/lib/expense-validators.ts`, so behavior is inconsistent between pages.
- **Impact**: Users can submit an impossible date range and see an empty list without any field error, making it look like there are no expenses instead of invalid input.
- **Recommendation**: Add a `from <= to` check to `parseExpenseListFilters`, mirroring `parseSummaryQuery`, and add unit/e2e coverage.

---

### 2. Unit tests for `pushoverNotifyEnv`

**Type**: TEST
**Output**: Update tests for `parseExpenseListFilters` to include test cases for reversed date ranges.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the existing vitest harness and `vi.spyOn(globalThis, 'fetch')` (or equivalent) — no real network. Do not assert on the existing Hono-context-based `pushoverNotify` here.

---

### 3. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `parseExpenseListFilters` and its tests. Update `Notes/wiki/index.md` and append one `## [YYYY-MM-DD] ingest | Issue 16: Fix filter date ordering` entry to `log.md`.
**Depends on**: 2

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`.

---

### 4. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/16-fix-filter-date-ordering/code-walkthrough/` covering: `src/lib/expense-validators.ts` (the new `from <= to` check in `parseExpenseListFilters`); the updated tests in `src/lib/expense-validators.test.ts`.
**Depends on**: 3

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 10. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 4

---
