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

- **New `lib/` modules**: `money.ts` (`formatCents`), `et-date.ts` (`todayEt`, `defaultRangeEt`, `isValidYmd`), and `expense-repo.ts` (`listExpenses`, `ExpenseRow`). Wiki pages added at `src/lib/money.md`, `src/lib/et-date.md`, `src/lib/expense-repo.md` (later renamed `db/expense-access.md`).
- **Source-code catalog**: bumped count 65 → 68; added the three new lib entries; updated the `build-expenses.tsx` description.
- **`src/routes/expenses/build-expenses.tsx`**: now calls `defaultRangeEt()` + `listExpenses(c, range)` and renders a DaisyUI table (`expenses-table`, `expense-row`, `expense-row-{date,description,category,tags,amount}`); empty state preserved. Wiki page rewritten.
- **Test routes**: extended `src/routes/test/database.ts` with `POST /test/database/seed-expenses` (creates categories/tags on the fly via case-insensitive lookup, inserts expense + join rows) and broadened `DELETE /test/database/clear` to truncate `expenseTag`, `expense`, `tag`, `category` so test isolation holds. Wiki page updated.
- **E2E helper**: `seedExpenses(rows)` and the `SeedExpenseRow` type added to `e2e-tests/support/db-helpers.ts`. Wiki page updated.
- **New e2e spec**: `e2e-tests/expenses/01-list-rendering.spec.ts` covers ordering (date desc, case-insensitive description asc), `formatCents` output (`1.00`, `1,234.56`, `45.67`, `9,876.00`), tag join, and out-of-window exclusion. Wiki page added under `e2e-tests/expenses/`. E2E catalog incremented 50 → 51 specs.
- **Unit tests**: `tests/money.spec.ts` (7 cases) and `tests/et-date.spec.ts` (DST + month-wrap + `isValidYmd` edges, ~20 cases). Wiki pages added; unit-test catalog 5 → 7.

## [2026-04-25] refactor | Split db-access into db-helpers + db/auth-access, move expense-repo to db/expense-access

- **`src/lib/db-helpers.ts`** (new) — extracted `withRetry` and `toResult` from former `db-access.ts`.
- **`src/lib/db/auth-access.ts`** (new) — auth queries from former `db-access.ts`; imports updated in 7 files.
- **`src/lib/db/expense-access.ts`** (new) — renamed from `expense-repo.ts`; `listExpenses` now follows the `withRetry` + `Result` pattern.
- **Wiki pages created**: `db-helpers.md`, `db/auth-access.md`, `db/expense-access.md`; deleted `db-access.md`, `expense-repo.md`; updated all cross-references.

## [2026-04-25] lint | Enforce non-functional requirements (coding-style, database-access, web-behavior)

Audited `src/` against `Notes/non-functional-reqs/{coding-style,database-access,web-behavior}.md` and fixed the violations:

- **`src/lib/validators.ts`** — `validateRequest` converted from `function` declaration to `const … =>` arrow function (coding-style: arrow functions only).
- **`src/routes/profile/handle-change-password.ts`** — `isErrorWithMessage`'s two single-line `if (...) return false` bodies wrapped in braces (coding-style: always brace `if`/`while` bodies).
- **`src/routes/expenses/build-expenses.tsx`** — error path replaced `c.text('Failed to load expenses', 500)` with `redirectWithError(c, PATHS.AUTH.SIGN_IN, 'Failed to load expenses. Please try again.')` (web-behavior: handlers never return plain text).
- **`src/middleware/guard-sign-up-mode.ts`** — missing-binding response replaced `c.text(...)` with `redirectWithError(c, PATHS.AUTH.SIGN_IN, 'Server configuration error. Please contact the administrator.')`; dropped the now-unused `INTERNAL_SERVER_ERROR` constant.
- **`src/index.ts`** — `bodyLimit` `onError` replaced `c.text('overflow :(', HTML_STATUS.CONTENT_TOO_LARGE)` with `redirectWithError(c, referer ?? PATHS.AUTH.SIGN_IN, 'The submitted request was too large. Please try again.')`. Imports updated (`HTML_STATUS` → `PATHS`; added `redirectWithError`).
- **`src/routes/test/database.ts`** — every direct Drizzle call (`db.delete/insert/select`) routed through a local `runDb<T>(fn)` helper that wraps `toResult` from `lib/db-helpers.ts` and rethrows on `Err` (database-access: all DB access via `withRetry`/`toResult`).

Wiki pages updated to reflect the new behaviour:

- `src/lib/validators.md` — note that `validateRequest` is now an arrow function.
- `src/middleware/guard-sign-up-mode.md` — describe the new `redirectWithError` flow.
- `src/routes/expenses/build-expenses.md` — document the new error redirect; added `lib/redirects.md` cross-reference.
- `src/routes/profile/handle-change-password.md` — added an "Internal helpers" section for `isErrorWithMessage` noting the brace style.
- `src/routes/test/database.md` — describe the `runDb` wrapper and its compliance with the database-access rule.
- `src/index.md` — describe the body-limit `redirectWithError` overflow handler; updated the constants cross-reference (`HTML_STATUS` → `PATHS`) and added a `lib/redirects.md` link.

Verification: `npx tsc --noEmit` produced only the two pre-existing `tests/send-email.spec.ts` errors that are unrelated to this change.

## [2026-04-25] ingest | Issue 03: entry form (existing categories only, no tags)

Ingested the Issue 03 work that adds the expense entry form at the top of `/expenses` and wires the create flow.

- **`src/lib/money.ts`**: added `parseAmount(input)` returning `Result<number, string>`. Two-regex strategy (`/^\d*\.?\d+$/` for no-comma; `/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/` for the comma case), then a separate decimal-place check. Rejects empty, zero, negatives, more than two decimals, malformed commas, and non-numeric. `Notes/wiki/src/lib/money.md` updated.
- **`src/lib/db/expense-access.ts`**: added `listCategories(db)` (sorted `lower(name) asc`), `createExpense(db, input)` (verifies the `categoryId` exists, generates a UUID, inserts the row), and the `CategoryRow` / `CreateExpenseInput` types. Both new functions follow the `withRetry` + `Result` pattern. `Notes/wiki/src/lib/db/expense-access.md` updated.
- **`src/routes/expenses/build-expenses.tsx`**: GET now also calls `listCategories` (in parallel with `listExpenses`) and renders the entry form above the list, with `data-testid`s `expense-form`, `expense-form-{description,amount,date,category,create}` and a `descriptionMax` constant following the `PRODUCTION:UNCOMMENT`/`PRODUCTION:REMOVE` convention. New `POST /expenses` validates the form via a local `validateExpenseForm` helper (description trimmed/length, `isValidYmd`, `categoryId`, `parseAmount`) and uses `redirectWithError` / `redirectWithMessage` for PRG. Flash messages render via the existing `useLayout` banner. `Notes/wiki/src/routes/expenses/build-expenses.md` rewritten.
- **`src/routes/test/database.ts`**: added `POST /test/database/seed-categories` (PRODUCTION:REMOVE), case-insensitive de-dup, returns `{ success, created }`. `Notes/wiki/src/routes/test/database.md` updated.
- **`e2e-tests/support/db-helpers.ts`**: added `seedCategories(rows)` and `SeedCategoryRow` matching the `seedExpenses` style. `Notes/wiki/e2e-tests/support/db-helpers.md` updated.
- **`e2e-tests/expenses/02-entry-form.spec.ts`** (new): three tests covering form-render defaults, every amount variant from the issue (with reverse-alpha descriptions so the new row sorts to the top via the case-insensitive description tiebreak), and server-side rejection of `0` / `abc`. `Notes/wiki/e2e-tests/expenses/02-entry-form.spec.md` added; `Notes/wiki/e2e-tests.md` count 51 → 52.
- **`tests/money.spec.ts`**: added a `parseAmount` `describe` block (~13 cases) on top of the existing `formatCents` block. `Notes/wiki/tests/money.spec.md` updated. All 20 tests pass via `bun test tests/money.spec.ts`.
- **Note**: the planned `tests/expense-access.spec.ts` was deferred per the task's "no DB harness exists yet" clause; the `createExpense` happy/sad paths are covered by `02-entry-form.spec.ts` instead.

Verification: `npx tsc --noEmit` clean on changed files (only pre-existing `tests/send-email.spec.ts` errors remain). `bun test tests/money.spec.ts` 20/20 pass. `npx playwright test e2e-tests/expenses/` 4/4 pass.

## [2026-04-26] ingest | Issue 04: validators + per-field error rendering

Ingested the Issue 04 work that swaps the single-string `validateExpenseForm` helper for a per-field validator + sticky-value flash flow.

- **`src/lib/expense-validators.ts`** (new): valibot schemas (`DescriptionSchema`, `AmountSchema`, `DateSchema`, `CategoryIdSchema`, `ExpenseCreateSchema`) plus `parseExpenseCreate(raw)` which returns `Result<ParsedExpenseCreate, FieldErrors>` — collecting *every* invalid field's message rather than short-circuiting. Re-exports `descriptionMax` (`200` prod / `202` test, PRODUCTION:UNCOMMENT). Amount errors come straight from `parseAmount` so the lower-level grammar stays authoritative. New wiki page `src/lib/expense-validators.md`.
- **`src/lib/form-state.ts`** (new): `redirectWithFormErrors(c, url, fieldErrors, values)` and `readAndClearFormState(c)` — single-use cookie (`COOKIES.FORM_ERRORS`) that round-trips `{fieldErrors, values}` across the redirect. Uses `STANDARD_COOKIE_OPTIONS` (HttpOnly, SameSite=Strict). New wiki page `src/lib/form-state.md`.
- **`src/constants.ts`**: added `COOKIES.FORM_ERRORS`. `src/constants.md` updated with the new cookie entry and a cross-link to `lib/form-state.md`.
- **`src/routes/expenses/build-expenses.tsx`**: GET now calls `readAndClearFormState(c)` and threads any flashed `{fieldErrors, values}` into a new `EntryFormState`. The `renderEntryForm` helper switched from `defaultValue` to `value={...}` everywhere (matches the project rule), uses `selected={...}` per `<option>`, and renders inline `expense-form-{description,amount,date,category}-error` testids next to each input via the new `fieldError` helper. Form has `noValidate`; date input switched from `type='date'` to `type='text'` with a `pattern` so impossible dates can reach the server. POST now delegates to `parseExpenseCreate` and uses `redirectWithFormErrors` on `Err` instead of composing a single error string. DB-failure and success paths still use the existing flash banner. `src/routes/expenses/build-expenses.md` rewritten.
- **`tests/expense-validators.spec.ts`** (new): 21 unit tests covering description (single-char, exact-max, empty, whitespace, over-max), amount (the four bad cases plus a happy case), date (leap day pass, the three bad cases, malformed shape), category (pass + two empties), and two multi-field cases proving simultaneous error reporting and selective preservation. New wiki page `tests/expense-validators.spec.md`. Unit-test catalog 7 → 8.
- **`e2e-tests/expenses/03-validation-errors.spec.ts`** (new): 7 Playwright tests — empty description, over-max description, four bad amounts (each with sticky-value assertion), invalid date `2025-13-40`, missing category, multi-field-at-once, and a fix-and-resubmit round trip. Local `descriptionMax = 202` mirrors the test-mode constant. New wiki page `e2e-tests/expenses/03-validation-errors.spec.md`. E2E catalog 52 → 53.
- **`e2e-tests/expenses/02-entry-form.spec.ts`**: zero/`abc` rejection assertion changed from `[role="alert"].alert-error` to the new `expense-form-amount-error` field-level testid (the global flash banner is no longer used for per-field validation). Wiki page updated with a cross-link to `03-validation-errors.spec.md`.
- **Catalogs**: `source-code.md` (count 69 → 71, added `expense-validators.md` and `form-state.md`, updated `money.md` and `build-expenses.md` summaries); `e2e-tests.md` (count 52 → 53, added the new spec entry); `unit-tests.md` (count 7 → 8, added the new spec entry).

Verification: `tsc --noEmit` clean (only pre-existing `tests/send-email.spec.ts` errors remain). `bun test tests/expense-validators.spec.ts` 21/21 pass. `playwright test e2e-tests/expenses/` 11/11 pass (4 prior + 7 new).

## [2026-04-26] fix | Unit test failures — Bun `node:test` polyfill bug + `send-email` signature drift

Fixed 6 failing tests and 4 `NotImplementedError` crashes across 5 spec files. Root causes were (1) Bun's `node:test` polyfill breaking on nested `describe()` blocks (oven-sh/bun#5090) and (2) `sendOtpToUserViaEmail` gaining an `env` parameter that the test still called without.

**`tests/send-email.spec.ts`**:
- Changed `import { describe, it } from 'node:test'` → `'bun:test'`.
- Added a local `mockEnv` object with `SMTP_SERVER_PORT`, `SMTP_SERVER_HOST`, `SMTP_SERVER_USER`, `SMTP_SERVER_PASSWORD`.
- Updated both mock `emailAgent` signatures to accept the leading `env` parameter.
- Updated both `sendOtpToUserViaEmail` call sites to pass `mockEnv` as the first argument.

**`tests/sign-up-utils.spec.ts`**, **`tests/expense-validators.spec.ts`**, **`tests/db-access-retry.spec.ts`**, **`tests/time-access.spec.ts`**:
- Changed `import { describe, it }` (and `beforeEach` for `time-access`) from `'node:test'` → `'bun:test'`.

**Wiki pages updated**: `tests/send-email.spec.md` (noted `bun:test` import, `mockEnv` setup, and updated mock-agent signature), `tests/sign-up-utils.spec.md` (noted `bun:test` import), `tests/expense-validators.spec.md` (updated Setup line from `node:test` to `bun:test`), `tests/db-access-retry.spec.md` (noted `bun:test` import), `tests/time-access.spec.md` (noted `bun:test` import).

Verification: `cd tests; bun test` — 94 pass, 0 fail, 0 errors across all 8 spec files.

## [2026-04-27] ingest | Issue 05: inline category creation

Ingested the Issue 05 work that swaps the entry-form category `<select>` for a free-form text input and adds a consolidated confirmation page for typed names that don't yet exist.

- **`src/lib/db/expense-access.ts`**: added `findCategoryByName(db, name)` (case-insensitive lookup via `lower(category.name) = lower(?)`, trims input, returns `Result.ok(null)` for empty/no-match) and `createCategoryAndExpense(db, input)` (single `db.batch([insert category, insert expense])` so a failure on either statement rolls the other back; lowercases the trimmed name; surfaces unique-name collisions as a clear `Result.err`). New `CreateCategoryAndExpenseInput` interface. `Notes/wiki/src/lib/db/expense-access.md` updated.
- **`src/lib/expense-validators.ts`**: renamed `CategoryIdSchema → CategorySchema`, `RawExpenseCreate.categoryId → category`, `ParsedExpenseCreate.categoryId → category` (the entry form now submits a typed *name*, not an id; existence/creation lives in the POST handler). Added `categoryNameMax` (`20` prod / `22` test, PRODUCTION:UNCOMMENT), `NewCategoryNameSchema`, and `parseNewCategoryName(input)` returning `Result<string, string>` with the trimmed-but-case-preserved value. `Notes/wiki/src/lib/expense-validators.md` updated.
- **`src/lib/form-state.ts`**: `ExpenseFormValues.categoryId → category`.
- **`src/routes/expenses/build-expenses.tsx`**: replaced the category `<select>` with an `<input type='text' name='category'>`. Removed the `listCategories` GET dependency and the `selectClass` helper. Added the new `renderConfirmCreateCategory` view, the `readRawBody` body-parser, and a `CONFIRM_CREATE_CATEGORY_PATH = '/expenses/confirm-create-category'` constant. Rewired `POST /expenses`: on no-match, runs `parseNewCategoryName`, lowercases on success, and renders the confirmation page directly (no DB writes). Added `POST /expenses/confirm-create-category` handler that handles both Confirm (defensive re-validation + `createCategoryAndExpense` + PRG to `/expenses`) and Cancel (`redirectWithFormErrors(c, PATHS.EXPENSES, {}, values)` to round-trip every typed value). `Notes/wiki/src/routes/expenses/build-expenses.md` rewritten.
- **`tests/expense-validators.spec.ts`**: added a 7-case `parseNewCategoryName` block (single char, exact-max, over-max, empty, whitespace-only, trim-and-return, case preservation), and updated the existing tests' input shape from `categoryId → category`. Suite is now 28/28. `Notes/wiki/tests/expense-validators.spec.md` updated.
- **`e2e-tests/expenses/02-entry-form.spec.ts`**: the render test now asserts on the input's empty value + `type='text'` (was: an `<option>` with text `Food`); `submitEntryForm` uses `.fill(opts.categoryName)` instead of `.selectOption({ label })`. `Notes/wiki/e2e-tests/expenses/02-entry-form.spec.md` updated.
- **`e2e-tests/expenses/03-validation-errors.spec.ts`**: `fillForm` switched from `.selectOption` to `.fill('')` / `.fill(label)`; the sticky-value assertion now checks `toHaveValue('Food')` rather than the previous regex against the option's id. No new tests in 03.
- **`e2e-tests/expenses/04-inline-category-creation.spec.ts`** (new, 5 tests): unmatched-name → confirmation page (with mirrored hidden values), Cancel preserves every typed value with no DB writes, Confirm creates the category + expense and case-insensitively matches `GROCERIES` against the just-lowercased `groceries` on the next submit, over-max name short-circuits the confirmation page, whitespace-only name short-circuits the confirmation page. `Notes/wiki/e2e-tests/expenses/04-inline-category-creation.spec.md` added.
- **Catalogs**: `e2e-tests.md` count `53 → 54`, added the new spec entry. `unit-tests.md` updated `expense-validators.spec` summary to mention `parseNewCategoryName`.

Verification: `npx tsc --noEmit` clean on changed files (only pre-existing `tests/send-email.spec.ts` errors remain). `bun test tests/expense-validators.spec.ts` 28/28 pass. `npx playwright test e2e-tests/expenses/` 16/16 pass (4 prior + 7 from Issue 04 + 5 new).
