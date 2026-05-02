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

## [2026-04-27] ingest | Issue 06: tags (no-JS CSV) + inline tag creation

Ingested the Issue 06 work that adds a tags CSV input next to the category input, generalises the Issue 05 confirmation page to a "Confirm new items" view that lists every new name (categories + tags) the submission would create, and updates the list rows to show alphabetised tags.

- **`src/lib/db/expense-access.ts`**: added `findTagsByNames(db, names)` (case-insensitive `IN (...)` lookup that trims/lower-cases/de-duplicates the input and short-circuits to `Result.ok([])` when the effective list is empty), `createExpenseWithTags(db, input)` (inserts the expense plus every `expenseTag` link in a single batch when there are tags, falls back to a bare insert otherwise — used on the all-existing path), and `createManyAndExpense(db, input)` (atomic `db.batch` that creates the optional new `category` row, every new `tag` row, the expense, and every `expenseTag` link in one shot — used on Confirm). `listExpenses` now alphabetises tag names within each row. `Notes/wiki/src/lib/db/expense-access.md` updated.
- **`src/lib/expense-validators.ts`**: added `tagNameMax` (`20` prod / `22` test, PRODUCTION:UNCOMMENT) and `parseTagCsv(input): Result<string[], string>` which splits on `,`, trims, drops empties, lower-cases, de-duplicates silently (preserving first-appearance order), and enforces `<= tagNameMax` per kept name. Added `tags?` to `FieldErrors`. `Notes/wiki/src/lib/expense-validators.md` updated.
- **`src/lib/form-state.ts`**: added `tags?: string` to `ExpenseFormValues` so the raw typed CSV round-trips through redirects byte-for-byte. `Notes/wiki/src/lib/form-state.md` updated.
- **`src/routes/expenses/build-expenses.tsx`**: added an `<input type='text' name='tags'>` CSV field below the category input with `data-testid='expense-form-tags'`, `maxlength={(tagNameMax + 2) * 8}`, and an `expense-form-tags-error` block. Renamed the confirmation route from `/expenses/confirm-create-category` to `/expenses/confirm-create-new`. Replaced `renderConfirmCreateCategory` with `renderConfirmCreateNew` which lists every new name (`Create category 'foo'` then alphabetised `Create tag 'bar'` lines) plus a five-field preview (`-description`, `-amount`, `-date`, `-category`, `-tags`). Confirm/Cancel testids renamed to `confirm-create-new-{page,confirm,cancel,list,category-line,tag-line,description,amount,date,category,tags}`. `POST /expenses` now also runs `parseTagCsv`, then `findTagsByNames`, computes the existing-vs-new diff, and either calls `createExpenseWithTags` (all-existing) or renders the generalised confirmation page (any-new). `POST /expenses/confirm-create-new` re-validates everything defensively, re-resolves diffs, and calls `createManyAndExpense`; collision errors surface under `category` when a new category was being created and `tags` otherwise. Cancel preserves every typed value (including the **raw** tag CSV with original case + duplicates). `Notes/wiki/src/routes/expenses/build-expenses.md` rewritten.
- **`tests/expense-validators.spec.ts`**: added an 8-case `parseTagCsv` block (empty string, simple two-tag, case-insensitive de-duplication, per-entry whitespace trim, single-entry over-max rejection, mixed-list over-max rejection, all-empty CSV → `[]`, exactly-max length pass). Suite is now 36/36. `Notes/wiki/tests/expense-validators.spec.md` updated.
- **`e2e-tests/expenses/04-inline-category-creation.spec.ts`**: updated every `confirm-create-category-*` selector to the renamed `confirm-create-new-*` testids. `Notes/wiki/e2e-tests/expenses/04-inline-category-creation.spec.md` updated.
- **`e2e-tests/expenses/05-tags-and-inline-creation.spec.ts`** (new, 5 tests): mixed existing+new tags routes through confirmation with case-insensitive de-duplication and alphabetical list rendering; brand-new category + new tags lists every new name first-time and takes the direct path on a follow-up all-existing submission; Cancel preserves the **raw** typed CSV byte-for-byte; over-max tag name shows `expense-form-tags-error` and skips confirmation; whitespace-only CSV creates the expense with no tags attached. `Notes/wiki/e2e-tests/expenses/05-tags-and-inline-creation.spec.md` added.
- **DB-helper unit tests**: deferred to the e2e per the Issue 05 pattern (no DB harness exists under `tests/`); the new helpers are exercised end-to-end by `04-` (existing-match path, Confirm-creates), `05-` (every diff branch, the atomic helper, the alphabetisation), and `01-` (list-row tag rendering).
- **Catalogs**: `e2e-tests.md` count `54 → 55`, added the new spec entry and noted the Issue 05 testid rename. `unit-tests.md` updated `expense-validators.spec` summary to mention `parseTagCsv`.

Verification: `npx tsc --noEmit` clean on `src/` (only pre-existing `tests/send-email.spec.ts` errors remain). `bun test tests/expense-validators.spec.ts` 36/36 pass. `npx playwright test e2e-tests/expenses/` 21/21 pass (16 prior + 5 new).

## [2026-04-28] ingest | Issue 07: progressive-enhancement JS

Ingested the Issue 07 work that adds a JS-on category combobox and tag chip picker on the entry-form page. The no-JS server flow (Issues 5 / 6) is preserved unchanged — the new modules are pure progressive enhancement.

- **`src/lib/db/expense-access.ts`**: added `listTags(db): Promise<Result<TagRow[], Error>>`, mirroring `listCategories` (drizzle import style, `withRetry` wrapping, `lower(name) ASC` ordering).
- **`src/routes/expenses/build-expenses.tsx`**: GET `/expenses` now also calls `listCategories` and `listTags`. The entry form emits two `<script type="application/json">` payloads with stable testids `categories-data` and `tags-data`, each `[{ name: string }]` of lower-cased names. JSON is escaped with `<` → `\u003c` (and `>` / `&` defensively) so a stray `</script>` cannot break out. The category input gets `data-category-combobox`; the tags input gets `data-tag-chip-picker`. Two `<script defer>` tags are emitted at the end of the page only — `renderer.tsx` is untouched so other pages pay zero cost.
- **`public/js/category-combobox.js`** (new): self-contained vanilla module. Mounts a per-input controller (kept on a module-private `WeakMap`) that renders a filtered listbox, supports ArrowUp / ArrowDown / Enter / Escape / Tab, shows a `Create '<typed>'` row when there's no exact match, and writes the chosen / typed name verbatim into the underlying input so the form POST is byte-identical to the no-JS path. ARIA: `role="combobox"`, `role="listbox"`, `aria-expanded`, `aria-activedescendant`. Test surface: `category-combobox-dropdown`, `category-combobox-option-<slug>`, `category-combobox-create`.
- **`public/js/tag-chip-picker.js`** (new): self-contained vanilla module. On init parses the existing input value with a local copy of the server's `parseTagCsv`, converts the original input to `type="hidden"`, and mounts a chip surface + search input + suggestions listbox. Adds chips on Enter / Comma / mouse click; removes via × button or Backspace at empty. Hidden input's CSV is re-serialized after every change so the form POST is byte-identical to the no-JS path. Names are written via `textContent` only. Test surface: `tag-chip-picker-surface`, `tag-chip-picker-input`, `tag-chip-picker-list`, `tag-chip-picker-option-<slug>`, `tag-chip-picker-create`, `tag-chip-<slug>`, `tag-chip-<slug>-remove`.
- **`tests/expense-access.spec.ts`** (new, header-only): documents that DB-helper assertions are deferred to Playwright, mirroring the Issue 05 / 06 decision (no in-memory D1 harness exists under `tests/`).
- **`e2e-tests/expenses/06-category-combobox-js.spec.ts`** (new): typing filters; ArrowDown + Enter selects an existing category and submits direct to `/expenses`; brand-new typed name surfaces `category-combobox-create` and routes through `confirm-create-new-page`.
- **`e2e-tests/expenses/07-tag-chip-picker-js.spec.ts`** (new): typing surfaces existing-tag suggestion; Enter adds a chip; `tag-chip-picker-create` adds a brand-new chip; hidden input value is normalized CSV in add-order; × button removes a chip; full submit routes through the confirmation page for the new tag; a second flow proves chip rehydration from the input's initial value after a server-side round-trip.
- **`e2e-tests/expenses/08-no-js-fallback.spec.ts`** (new): builds a `javaScriptEnabled: false` Playwright context and asserts the combobox and chip surface do not mount, the category and tags inputs remain plain text inputs, an all-existing submission goes straight to `/expenses`, and a brand-new category + new tags submission still reaches `confirm-create-new-page` and creates the row on confirm.
- **`Notes/wiki/public-js/index.md`** (new): documents the JSON contract, the data-attribute hooks, the two modules' public testid surfaces, and the JS-on / JS-off equivalence guarantee.
- **Catalogs**: `index.md` linked the new `public-js/` page; `source-code.md` updated `expense-access.ts` summary to mention `listTags` and the other helpers added in earlier issues. Wiki page count for new entries: 1.

Verification: deferred to the human-review step (task 15). The verification commands are `npx tsc --noEmit`, `bun test`, and `npx playwright test e2e-tests/expenses/06-category-combobox-js.spec.ts e2e-tests/expenses/07-tag-chip-picker-js.spec.ts e2e-tests/expenses/08-no-js-fallback.spec.ts`.

## [2026-04-30] ingest | Issue 08: edit and delete expense

Ingested the Issue 08 work that adds the row-level Edit button, the pre-populated edit page, the consolidated *Confirm new items* page in `mode='edit'`, and the single-step delete-confirmation page. The all-existing edit path mirrors the all-existing create path; the any-new edit path mirrors the Issue 06 confirm-create-new pattern. Tag-link replacement is handled by deleting + re-inserting `expenseTag` rows inside the same `db.batch` so the operation is atomic. Cascade-on-delete in the schema cleans up link rows automatically when an expense is deleted.

- **`src/lib/db/expense-access.ts`**: added `getExpenseById(db, id)` (`Result<ExpenseDetailRow | null, Error>` — `ExpenseDetailRow extends ExpenseRow` with `categoryId` + `tagIds`), `updateExpenseWithTags(db, input)`, `updateManyAndExpense(db, input)` (mirrors `createManyAndExpense` for the update path; collisions roll back the whole batch), and `deleteExpense(db, id)`. All four wrapped with `withRetry` and follow the existing drizzle / `Result` patterns.
- **`src/lib/money.ts`**: added `formatCentsPlain(cents)` — same arithmetic as `formatCents` but with no comma grouping, suitable for round-tripping through the entry/edit form's amount input.
- **`src/routes/expenses/expense-form.tsx`** (new module): exports `renderExpenseForm({ mode, action, state, payloads })` and `renderConfirmNewItems({ mode, action, ...preview, values })`. Both helpers are mode-agnostic in their data flow and pick mode-specific testids (`expense-form-create` vs `expense-form-save`; `confirm-create-new-*` vs `confirm-edit-new-*`).
- **`src/routes/expenses/build-expenses.tsx`**: refactored to call the new shared helpers; removed the inlined `renderEntryForm`, `renderConfirmCreateNew`, `fieldError`, `inputClass`, and the local `EntryFormState` / `EntryPayloads` types. Each list row now carries an `<a data-testid='expense-row-edit' class='btn btn-sm' href='/expenses/:id/edit'>Edit</a>` cell with a matching empty `<th></th>` so header column count stays balanced.
- **`src/routes/expenses/build-edit-expense.tsx`** (new module): registers `GET /expenses/:id/edit`, `POST /expenses/:id/edit`, `POST /expenses/:id/confirm-edit-new`, `GET /expenses/:id/delete`, `POST /expenses/:id/delete` — all gated by `signedInAccess`. The edit GET applies `ALLOW_SCRIPTS_SECURE_HEADERS` so the JS-on combobox + chip picker mount; everything else uses `STANDARD_SECURE_HEADERS`. The delete page renders a single confirmation form with `confirm-delete-expense-{date,description,amount,category,tags}` testids and a Confirm/Cancel pair.
- **`src/index.ts`**: imported and wired `buildEditExpense(app)` next to `buildExpenses(app)`.
- **`tests/expense-access.spec.ts`**: header comment updated to note that the new Issue 08 helpers are exercised by the new Playwright specs (no in-memory D1 harness exists under `tests/`, mirroring the Issue 05 / 06 / 07 decision).
- **`e2e-tests/expenses/09-edit-expense.spec.ts`** (new, 4 tests): all-existing edit flow — pre-population, amount-only edit, description+date edit, unknown-id redirect.
- **`e2e-tests/expenses/10-edit-with-new-items.spec.ts`** (new, 3 tests): consolidated *Confirm new items* in `mode='edit'` — new-tag confirm/save, cancel preserves typed values with no DB changes, brand-new category + tag confirm/save.
- **`e2e-tests/expenses/11-delete-expense.spec.ts`** (new, 3 tests): delete flow — cancel returns to edit, confirm removes the row (siblings intact), unknown-id redirect.
- **Wiki pages**: added `Notes/wiki/src/routes/expenses/expense-form.md` and `.../build-edit-expense.md`; updated `expense-access.md` (four new helpers + cross-link), `money.md` (`formatCentsPlain`), `build-expenses.md` (Edit button + shared-renderer cross-link), `source-code.md` (catalog), `e2e-tests.md` (three new spec entries), and added the three matching spec wiki pages under `Notes/wiki/e2e-tests/expenses/`. `index.md` did not need changes (no new top-level sections).

Verification: `npx playwright test e2e-tests/expenses/` passes 36/36 (10 new + 26 prior expense specs).

## [2026-05-02] lint | Accuracy audit of wiki against source code

Full audit of all 73 source files against their wiki documentation. Found and fixed 12 issues:

- **`types.d.md`** — was completely wrong; described a global `test` variable that no longer exists. Rewrote to reflect Hono module augmentation and `Bindings` interface.
- **`style.md`** — described Tailwind v3 directives (`@tailwind base/components/utilities`); replaced with v4 `@import`/`@plugin`/`@theme` syntax and 15 font families.
- **`better-auth-response-interceptor.md`** — described old handler logic with fictional error codes. Rewrote to match actual implementation: form-to-JSON conversion, status-code dispatch (200/401/403/400/500), and `EMAIL_NOT_VERIFIED` handling.
- **`index.md`** — body-limit overflow wrongly said it uses `redirectWithError`; corrected to `c.text('overflow :(', 413)`. Also added missing `buildEditExpense` to always-registered routes.
- **`renderer.md`** — title was `'Worker, D1, Drizzle'`; corrected to `'Expense Log'`.
- **`lib/auth.md`** — trusted origins listed old URLs `localhost:8787`, `cls.cloud`; corrected to `localhost:3000`, `127.0.0.1:3000`, `alternateOrigin`.
- **`signed-in-access.md`** — step order was inverted (no-cache before auth check); corrected to auth check → redirect → no-cache → next().
- **`build-sign-in.md`** — wrong `data-testid` values (`signin-email-input` → `email-input`, etc.) and wrong success message text; all corrected.
- **`send-email.md`** — SMTP env var names missing `SMTP_SERVER_` prefix; return type described as boolean instead of `Result`. Both fixed.
- **`version.md`** — claimed version used for stylesheet cache-busting; corrected to footer display only (`Copyright © 2025 V-{version}`).
- **`source-code.md`** — file count was 71; corrected to 73.
