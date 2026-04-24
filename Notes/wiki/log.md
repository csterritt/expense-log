# Wiki Log

Chronological, append-only record of wiki activity.

## [2026-04-21] ingest | Initial project scan

Scanned the entire codebase to establish baseline wiki.

- Listed 47 source files under `src/`.
- Listed 36 end-to-end test files under `e2e-tests/`.
- Listed 5 unit test files under `tests/`.
- Created `AGENT.md`, `index.md`, `log.md`, `project-overview.md`, `source-code.md`, `e2e-tests.md`, and `unit-tests.md`.
- No contradictions or stale claims at this time (initial ingest).

## [2026-04-21] ingest | Per-file wiki pages

Created individual wiki pages for every source and test file.

- 61 source files under `Notes/wiki/src/` (mirrors `src/` structure).
- 47 E2E spec files + 11 support files under `Notes/wiki/e2e-tests/` (mirrors `e2e-tests/` structure).
- 5 unit test files under `Notes/wiki/tests/` (mirrors `tests/` structure).
- Updated `source-code.md`, `e2e-tests.md`, and `unit-tests.md` to link to the new per-file pages.
- Updated `index.md` to reflect the expanded structure.

## [2026-04-22] document | E2E and unit test wiki files completed

Replaced all stub wiki entries for E2E spec, support, and unit test files with detailed markdown documentation.

- **E2E support files (11):** Added purpose, exports, cross-references for `auth-helpers`, `db-helpers`, `finders`, `form-helpers`, `mode-helpers`, `navigation-helpers`, `page-verifiers`, `test-data`, `test-helpers`, `validation-helpers`, `workflow-helpers`.
- **E2E spec files (47):** Documented all Playwright test files across `general/`, `gated-sign-up/`, `interest-sign-up/`, `no-sign-up/`, `profile/`, `reset-password/`, `sign-in/`, and `sign-up/` with purpose, test cases, and helper details.
- **Unit test files (5):** Documented `db-access-retry.spec`, `send-email.spec`, `sign-up-utils.spec`, `time-access.spec`, and `url-validation.spec` with purpose, key logic tested, and test cases.
- All entries follow the established wiki style with `## Purpose` and `## Test cases` / `## Exports` sections, plus cross-references to related wiki pages.

## [2026-04-24] ingest | Project rename and expense feature scaffold

Ingested commits `4c9d006` (Task 01: schema, nav, empty list) and `394b4b0` (Task 01A: remove `/private` path).

- **Project**: renamed from `daisy-tw-worker-d1-drizzle` to `expense-log` in `AGENT.md` and `project-overview.md`; expanded overview with the expense feature description.
- **Schema**: added `category`, `tag`, `recurring`, `expense`, `expenseTag`, `recurringTag` tables (and inferred types) to `src/db/schema.md`, including the partial unique index `expense_recurring_occurrence_unique`.
- **Constants**: added `PATHS.EXPENSES`, `CATEGORIES`, `TAGS`, `SUMMARY`, `RECURRING`; removed `PATHS.PRIVATE`.
- **Routes**: deleted wiki page for the removed `build-private.tsx`; created new pages for `build-expenses` (under `src/routes/expenses/`), `build-categories`, `build-tags`, `build-summary`, and `build-recurring`. Updated `source-code.md` catalog (count 61 → 65).
- **Layout**: rewrote `build-layout.md` to match the new "Expense Log" navbar with `expenses-nav`, `categories-nav`, `tags-nav`, `summary-nav`, `recurring-nav`, profile, and POST sign-out.
- **Auth redirects**: every "already signed in" redirect (`build-sign-in`, `build-sign-up`, `build-gated-sign-up`, `build-interest-sign-up`, `build-gated-interest-sign-up`) and the verified-sign-in path in `better-auth-response-interceptor` now target `/expenses`. `lib/auth.md` notes `redirectTo: '/expenses'`. `build-profile`'s "Back" link goes to `/expenses`. `signed-in-access` middleware page now lists the protected expense routes.
- **E2E**: added catalog entries and per-spec wiki pages for `general/06-expense-routes-require-auth`, `general/07-expense-routes-signed-in`, and `general/08-expense-nav-links` (count 47 → 50). Updated `sign-in/02`, `sign-in/04`, `sign-in/05`, `sign-up/04`, and `interest-sign-up/03` to refer to `/expenses` instead of `/private`.
- **Support helpers**: updated `test-data.md` (`BASE_URLS.PRIVATE` → `EXPENSES`), `page-verifiers.md` (`verifyOnProtectedPage` now asserts `expenses-page`), and `navigation-helpers.md` (`navigateToPrivatePage` → `navigateToExpensesPage`).

## [2026-04-24] ingest | Issue 02: list view rendering

Ingested the Issue 02 work that turns `/expenses` into a working date-filtered list view.

- **New `lib/` modules**: `money.ts` (`formatCents`), `et-date.ts` (`todayEt`, `defaultRangeEt`, `isValidYmd`), and `expense-repo.ts` (`listExpenses`, `ExpenseRow`). Wiki pages added at `src/lib/money.md`, `src/lib/et-date.md`, `src/lib/expense-repo.md`.
- **Source-code catalog**: bumped count 65 → 68; added the three new lib entries; updated the `build-expenses.tsx` description.
- **`src/routes/expenses/build-expenses.tsx`**: now calls `defaultRangeEt()` + `listExpenses(c, range)` and renders a DaisyUI table (`expenses-table`, `expense-row`, `expense-row-{date,description,category,tags,amount}`); empty state preserved. Wiki page rewritten.
- **Test routes**: extended `src/routes/test/database.ts` with `POST /test/database/seed-expenses` (creates categories/tags on the fly via case-insensitive lookup, inserts expense + join rows) and broadened `DELETE /test/database/clear` to truncate `expenseTag`, `expense`, `tag`, `category` so test isolation holds. Wiki page updated.
- **E2E helper**: `seedExpenses(rows)` and the `SeedExpenseRow` type added to `e2e-tests/support/db-helpers.ts`. Wiki page updated.
- **New e2e spec**: `e2e-tests/expenses/01-list-rendering.spec.ts` covers ordering (date desc, case-insensitive description asc), `formatCents` output (`1.00`, `1,234.56`, `45.67`, `9,876.00`), tag join, and out-of-window exclusion. Wiki page added under `e2e-tests/expenses/`. E2E catalog incremented 50 → 51 specs.
- **Unit tests**: `tests/money.spec.ts` (7 cases) and `tests/et-date.spec.ts` (DST + month-wrap + `isValidYmd` edges, ~20 cases). Wiki pages added; unit-test catalog 5 → 7.
