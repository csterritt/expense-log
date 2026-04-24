# Tasks for #02: Expense list view rendering

Parent issue: `Notes/issues/02-list-view-rendering.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Create `money` module with `formatCents`

**Type**: WRITE
**Output**: `src/lib/money.ts` exports `formatCents(cents: number): string` returning `1,234.56`-style strings (US-English comma thousands, always 2 decimals). No `parseAmount` in this slice.
**Depends on**: none

Follow the arrow-function / functional style used in other modules under `src/lib/`. Keep the file small and focused; no DB or external imports. Match the naming and export conventions of neighbors like `src/lib/time-access.ts`.

---

### 2. Unit tests for `money.formatCents`

**Type**: TEST
**Output**: `tests/money.spec.ts` covers `0`, `1`, `99`, `100`, `12345`, `123456`, `100000000` and confirms exact formatted output.
**Depends on**: 1

Match the style of `tests/time-access.spec.ts` and `tests/sign-up-utils.spec.ts`. Use the same test runner the other specs in `tests/` already use.

---

### 3. Create `et-date` module

**Type**: WRITE
**Output**: `src/lib/et-date.ts` exports `todayEt()`, `defaultRangeEt()`, and `isValidYmd(s)`. `todayEt` returns the current `YYYY-MM-DD` in `America/New_York`; `defaultRangeEt` returns `{ from, to }` where `from` is the first of the month two months before `todayEt` and `to` is `todayEt`; `isValidYmd` returns true iff `s` is a valid calendar date in `YYYY-MM-DD`.
**Depends on**: none

Use `Intl.DateTimeFormat` with `timeZone: 'America/New_York'` for the ET conversion (works on Cloudflare Workers without extra deps). Allow `todayEt` to take an optional injected `Date` for testability, consistent with how `src/lib/time-access.ts` accepts an injected clock. `defaultRangeEt` should accept the same optional reference so tests can pin it.

---

### 4. Unit tests for `et-date`

**Type**: TEST
**Output**: `tests/et-date.spec.ts` covers: DST spring-forward and fall-back boundaries; month boundaries for `defaultRangeEt` (e.g. asserting Jan → Nov of previous year, Mar 1 → Jan 1); `isValidYmd` edges (`2024-02-29` true, `2023-02-29` false, `2024-13-01` false, `2024-04-31` false, malformed shapes false).
**Depends on**: 3

Inject fixed reference dates via the optional parameters added in task 3. Do not use the system clock.

---

### 5. Extend `expense-repo` with `listExpenses`

**Type**: WRITE
**Output**: `src/lib/expense-repo.ts` exports `listExpenses(c, filters: { from: string; to: string }): Promise<ExpenseRow[]>` returning rows (id, date, description, categoryName, amountCents, tagNames[]) whose `date` is in `[from, to]` inclusive, sorted by `date DESC` then case-insensitive `description ASC`. The filters type may be broader for future issues, but only the date range is implemented here.
**Depends on**: Issue 01 schema (already merged)

Follow the drizzle usage in `src/lib/db-access.ts`. Join `expense` → `category` for the name; gather tag names via join through `expenseTag` → `tag` using whichever grouping/secondary-query approach is clearest given existing db-access patterns. Apply the case-insensitive tie-break via `lower(description) asc` in the ORDER BY. Export `ExpenseRow` as a named type. If the file does not yet exist, create it; otherwise extend it in place.

---

### 6. Test-only route to seed expenses

**Type**: WRITE
**Output**: A new `POST /test/database/seed-expenses` route, guarded by `isTestRouteEnabledFlag` and marked `// PRODUCTION:REMOVE`, that accepts a JSON array of `{ date, description, amountCents, categoryName, tagNames? }` objects and inserts categories/tags/expenses + join rows as needed, creating categories/tags on the fly (case-insensitive lookup). Response shape: `{ success: true, created: number }`.
**Depends on**: 5

Place alongside the existing `/test/database/*` routes (see `src/lib/test-routes.ts` and how they're wired in `src/index.ts`). Reuse the test-route enablement pattern exactly so the endpoint is compiled out of production via the existing comment conventions.

---

### 7. Add `seedExpenses` e2e helper

**Type**: WRITE
**Output**: `e2e-tests/support/db-helpers.ts` gains an exported `seedExpenses(rows)` that POSTs to `/test/database/seed-expenses` in the same style as the existing `seedDatabase` helper.
**Depends on**: 6

Match the error-handling and logging style of the existing helpers in the same file.

---

### 8. Render expense rows on `/expenses`

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` now, for signed-in users, calls `defaultRangeEt()`, then `listExpenses(c, range)`. When the result is non-empty, renders a DaisyUI `table` whose rows show date, description, category name, comma-separated tag names, and `formatCents(amountCents)`. Table, rows, and key cells carry `data-testid`s following project conventions (e.g. `expense-row`, `expense-row-date`, `expense-row-amount`). The empty-state from Issue 01 is preserved when the result is empty.
**Depends on**: 5

Use DaisyUI/Tailwind styling consistent with `src/routes/build-layout.tsx`. Do not add the entry form, filters, or Edit buttons — those belong to later issues. No pagination.

---

### 9. Playwright e2e for `/expenses` list rendering

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` that signs in a test user; seeds expenses in the current month, one and two months prior, plus one outside the window (three+ months back); and asserts that only in-window rows render, ordering is date desc with case-insensitive description tiebreak, amount formatted as `1,234.56`, and the out-of-window row is absent.
**Depends on**: 7, 8

Use `seedExpenses` from task 7 and sign-in helpers from `e2e-tests/support/`. Select rows via the `data-testid`s introduced in task 8.

---

### 10. Update the wiki

**Type**: DOCUMENT
**Output**: The wiki under `Notes/wiki/` is updated to reflect the new `money` and `et-date` modules, the `listExpenses` addition to `expense-repo`, the new seed-expenses test route, the new `seedExpenses` e2e helper, and the list rendering on `/expenses`. `Notes/wiki/index.md` and `Notes/wiki/log.md` are both updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 9

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Create or update pages under `Notes/wiki/src/lib/`, `Notes/wiki/src/routes/expenses/`, `Notes/wiki/e2e-tests/support/`, and `Notes/wiki/tests/` as appropriate, cross-linking to any pages the Issue 01 work produced. Append a single `## [YYYY-MM-DD] ingest | Issue 02: list view rendering` entry to `log.md`.

---

### 11. Walkthrough

**Type**: WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/02-list-view-rendering/` covering the `money` and `et-date` modules, `listExpenses`, the seed-expenses test route, and the list rendering on `/expenses`.
**Depends on**: 10

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 12. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 11

---
