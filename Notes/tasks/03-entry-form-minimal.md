# Tasks for #03: Entry form (existing categories only, no tags)

Parent issue: `Notes/issues/03-entry-form-minimal.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Extend `money` with `parseAmount`

**Type**: WRITE
**Output**: `src/lib/money.ts` exports `parseAmount(input: string): Result<number, string>` (using `true-myth/result`, matching neighboring modules) that returns the integer cents for valid positive decimal strings with at most 2 fractional digits. Trim whitespace, strip commas, accept forms like `1234.56`, `1,234.56`, `1234`, `.50`. Reject empty, zero, negative, more than 2 decimal places, malformed comma placement, and non-numeric input with a short user-facing error string.
**Depends on**: none

Read and follow the non-functional requirements under `Notes/non-functional-reqs/` (coding style, web behavior, database access). Match the arrow-function / functional style already used in `src/lib/money.ts`. Keep the new export beside `formatCents`. Use a single lenient regex for the positive-decimal shape, then validate decimal-place count separately. Do not introduce a class; do not throw — return `Result.ok(cents)` or `Result.err(message)`.

---

### 2. Unit tests for `money.parseAmount`

**Type**: TEST
**Output**: `tests/money.spec.ts` gains cases covering: `1234.56` → 123456, `1,234.56` → 123456, `1234` → 123400, `.50` → 50, leading/trailing whitespace accepted, malformed commas (e.g. `1,23.45`, `,123`, `12,3456`) rejected, `0` and `0.00` rejected, negatives rejected, `1.234` (too many decimals) rejected, `abc` rejected, empty string rejected.
**Depends on**: 1

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the existing test style in `tests/money.spec.ts` and `tests/et-date.spec.ts`. Assert both the ok branch (numeric value) and the err branch (presence of an error) — do not lock down exact error wording.

---

### 3. Add `listCategories` to `expense-access`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `listCategories(db): Promise<Result<CategoryRow[], Error>>` returning `{ id, name }` rows from the `category` table sorted by case-insensitive `name ASC`. Export `CategoryRow` as a named type. Wrap the query with `withRetry` exactly like `listExpenses`.
**Depends on**: none

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use the same drizzle import style and `Result` wrapping pattern used by `listExpenses` in the same file. Order via `asc(sql\`lower(${category.name})\`)` to match the list-view tiebreak convention.

---

### 4. Add `createExpense` to `expense-access`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `createExpense(db, input: { date: string; description: string; categoryId: string; amountCents: number }): Promise<Result<{ id: string }, Error>>` that verifies the `categoryId` exists, generates a new id (matching the id-generation approach used elsewhere for the `expense` table — review `src/db/schema.ts` to confirm), inserts a row into `expense`, and returns the new id. No tag handling in this slice.
**Depends on**: none

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Wrap the database work with `withRetry` and return `Result.err` with a clear message when the category is missing. Match the error-handling style of `listExpensesActual`. Do not couple this function to HTTP — it takes already-validated inputs.

---

### 5. Unit tests for `createExpense` category validation

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` (new) covers: `createExpense` rejects with `Result.err` when the category id does not exist, and inserts a row when it does. Uses an in-memory or test sqlite client consistent with how other DB-touching tests are wired in `tests/`.
**Depends on**: 4

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. If the existing `tests/` directory does not yet provide a DB harness, defer this task to integration coverage in task 11 instead and note that here — do not invent a new harness pattern.

---

### 6. Add seed-categories test route

**Type**: WRITE
**Output**: A new `POST /test/database/seed-categories` route, guarded by the existing test-route enablement flag and marked `// PRODUCTION:REMOVE`, accepting a JSON array of `{ name }` objects and inserting categories (case-insensitive de-dup against existing rows). Response `{ success: true, created: number }`.
**Depends on**: none

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Place alongside the existing `/test/database/*` routes (see `src/routes/test/` and how Issue 02 added `seed-expenses`). Reuse the same enablement/comment conventions exactly so the endpoint compiles out of production builds.

---

### 7. Add `seedCategories` e2e helper

**Type**: WRITE
**Output**: `e2e-tests/support/db-helpers.ts` gains an exported `seedCategories(rows)` that POSTs to `/test/database/seed-categories`, in the same style as `seedExpenses`.
**Depends on**: 6

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the error-handling and logging style of the existing helpers in the same file.

---

### 8. Render entry form on `/expenses`

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` renders an entry form above the list (or above the empty-state) for signed-in users. Fields: `description` (text, `required`, `maxlength` per the local `descriptionMax` constant with `PRODUCTION:UNCOMMENT` pattern), `amount` (text, `required`, `inputmode='decimal'`), `date` (`type='date'`, `required`, `value` defaulted to `todayEt()`), `category` (`<select>` populated from `listCategories`, `required`, with a disabled placeholder option). Submit posts to `PATHS.EXPENSES` (or a new `PATHS.EXPENSES_CREATE` const). Form, inputs, and submit carry `data-testid`s following project conventions (e.g. `expense-form`, `expense-form-description`, `expense-form-amount`, `expense-form-date`, `expense-form-category`, `expense-form-create`). Surface any flash error/message cookie above the form.
**Depends on**: 3

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use the `value` attribute (not `defaultValue`) for the date default and any sticky values on error redirect. Use DaisyUI/Tailwind styling consistent with `src/routes/build-layout.tsx`. If `listCategories` errors, fall back to redirecting via `redirectWithError` exactly as the existing GET handler does for `listExpenses`. Define `descriptionMax` per the testing/production-comment convention in `Notes/non-functional-reqs/coding-style.md`.

---

### 9. Wire POST handler that creates the expense

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` registers a POST handler at the same path the form submits to. The handler: requires sign-in (reuse `signedInAccess`), parses the form body, validates `description` (non-empty, `<= descriptionMax`), `date` via `isValidYmd`, `categoryId` non-empty, and `amount` via `parseAmount`. On any validation failure, redirect back to `/expenses` with `redirectWithError` carrying a single composed message. On success, call `createExpense` and redirect to `/expenses` with `redirectWithMessage` (post-redirect-get; cleared form on next render). On `createExpense` error, redirect with `redirectWithError`.
**Depends on**: 1, 4, 8

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use `redirectWithError` / `redirectWithMessage` per `Notes/non-functional-reqs/web-behavior.md`. Do not return inline HTML on validation failure. Keep the handler small — extract a pure validator helper if it improves readability.

---

### 10. Show flash message banner on `/expenses`

**Type**: WRITE
**Output**: The GET render path on `/expenses` displays the success/error flash cookie (if present) above the entry form, with `data-testid='expenses-flash-message'` / `expenses-flash-error`. Reuse whatever shared banner pattern the rest of the app already uses (search for existing flash rendering before adding a new one).
**Depends on**: 8

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. If a shared banner component already exists, use it; do not duplicate styling.

---

### 11. Playwright e2e for entry form

**Type**: TEST
**Output**: New spec under `e2e-tests/expenses/` (e.g. `02-entry-form.spec.ts`) that signs in, seeds a category via `seedCategories`, visits `/expenses`, asserts the date input defaults to today (ET) and the category select lists the seeded category, then submits the form for each amount input variant from the issue (`1234.56`, `1,234.56`, `1234`, `.50`). After each submission asserts: redirect lands on `/expenses`, the new row appears at the top, the form is cleared, and the amount renders formatted as `X,XXX.XX`. Includes one negative case asserting that `0` and `abc` produce a flash error and no new row.
**Depends on**: 7, 9, 10

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use sign-in helpers from `e2e-tests/support/`, `seedCategories` from task 7, and select elements via the `data-testid`s introduced in tasks 8 and 10. Follow the structure of `e2e-tests/expenses/01-list-rendering.spec.ts`.

---

### 12. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: `parseAmount` addition to `money`, `listCategories` and `createExpense` additions to `expense-access`, the new `seed-categories` test route, the `seedCategories` e2e helper, and the entry form on `/expenses`. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 11

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link to pages produced by Issues 01 and 02. Append a single `## [YYYY-MM-DD] ingest | Issue 03: entry form (existing categories only, no tags)` entry to `log.md`.

---

### 13. Walkthrough

**Type**: WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/03-entry-form-minimal/` covering `parseAmount`, `listCategories`, `createExpense`, the seed-categories test route, and the entry form + POST handler on `/expenses`.
**Depends on**: 12

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 14. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 13

---
