# Tasks for #05: Inline category creation via consolidated confirmation page (no-JS path)

Parent issue: `Notes/issues/05-inline-category-creation.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add `findCategoryByName` to `expense-access`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `findCategoryByName(db, name: string): Promise<Result<CategoryRow | null, Error>>` that performs a case-insensitive lookup on `category.name` (compare via `lower(category.name) = lower(?)`) and returns the matching `{ id, name }` row, or `null` when no match exists. Wrap with `withRetry` consistent with the other helpers in this file.
**Depends on**: none

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the drizzle import style and `Result` wrapping pattern already used by `listCategories` and `createExpense` in the same file. Trim the `name` argument before comparing; treat empty input as a `Result.ok(null)` rather than an error (callers will have already rejected empty names via the validator from task 4).

---

### 2. Add `createCategoryAndExpense` atomic helper

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `createCategoryAndExpense(db, input: { newCategoryName: string; date: string; description: string; amountCents: number }): Promise<Result<{ categoryId: string; expenseId: string }, Error>>` that, inside a single drizzle transaction, inserts a new `category` row with the supplied name normalized to lowercase (after trim) and inserts the associated `expense` row referencing the new category id. Returns both ids on success. If a row with the same lowercase name already exists (race), the transaction must rollback and the function must return `Result.err` with a clear message — callers will then redirect to the entry form with a field-level error.
**Depends on**: 1

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use `db.transaction(...)` per drizzle's API, generate ids via the same approach used in `createExpense`, and reuse `withRetry` for the outer wrapper. Do not duplicate the existing-category check from task 1 inside the transaction; rely on the unique index on `category.name` to fail the transaction on collisions and translate that error to a friendly message. Keep the helper HTTP-agnostic.

---

### 3. Unit tests for new DB helpers

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` (extend if it exists from Issue 03 task 5, otherwise create) covers: `findCategoryByName` returns the matching row regardless of case, returns `null` for unknown names, and accepts surrounding whitespace; `createCategoryAndExpense` inserts both rows and rolls back when a collision occurs (pre-seed a category with the same lowercased name and assert no expense row was created).
**Depends on**: 2

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use the same test-DB harness used elsewhere in `tests/`. Match the assertion style of `tests/money.spec.ts` and `tests/expense-validators.spec.ts`. If no DB harness was established in Issue 03 task 5, defer the assertions for these helpers to the Playwright e2e in task 9 and note that here — do not invent a new harness pattern.

---

### 4. Extend `expense-validators` with new-category-name rules

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` gains a `parseNewCategoryName(input: string): Result<string, string>` helper (or an extension to `parseExpenseCreate` — pick whichever keeps the call site small and document the choice in the file header) enforcing: trim, non-empty, length `<= categoryNameMax`. Export `categoryNameMax` from the validators module using the `PRODUCTION:UNCOMMENT` pattern (production value 20, testing value at least 22). The success branch returns the trimmed input (case-preserving — lowercasing happens in the DB helper from task 2). Add a `category` entry to `FieldErrors` semantics so the entry form renders the length error inline.
**Depends on**: Issue 04 task 1

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the valibot usage and `safeParse`-driven extraction style of `src/lib/validators.ts` and the existing `expense-validators.ts`. Keep the constant export local to the validator module so the entry form's `<input maxlength>` and the validator stay in sync.

---

### 5. Unit tests for new-category-name validation

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` adds cases for the new-category-name path: empty after trim (fail), single char (pass), `categoryNameMax` chars (pass), `categoryNameMax + 1` chars (fail), surrounding whitespace trimmed (pass with trimmed value).
**Depends on**: 4

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the existing assertion style — assert presence of an error string per failing case, not exact wording.

---

### 6. Replace category `<select>` with a plain `<input>` on the entry form

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` swaps the category `<select>` for a `<input type="text" name="category">` with `required`, `maxlength` set from `categoryNameMax` (testing value), `data-testid="expense-form-category"`, and `value={formValues.category ?? ''}` for sticky values across error redirects. Remove the placeholder option logic and any code that depends on the select shape. Continue to render the field-level error block introduced in Issue 04 task 3 immediately below the input. Do not introduce client-side JS (the combobox lands in Issue 7).
**Depends on**: 4, Issue 04 task 3

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use the `value` attribute (not `defaultValue`). Keep the existing `listCategories` call in the GET handler only if it is still needed by other code on the page; otherwise remove it cleanly along with any unused imports.

---

### 7. Render the consolidated confirmation page

**Type**: WRITE
**Output**: A new render path under `src/routes/expenses/` (e.g. `build-confirm-create-category.tsx` or an exported renderer inside `build-expenses.tsx` — pick whichever keeps the existing file under ~300 lines) that returns a full-page DaisyUI/Tailwind layout titled along the lines of "Confirm new category" and shows: a line "Create category 'foo'" using the lowercased normalized name; a definition list previewing the expense (description, formatted amount via `formatCents`, date, new category name); a Confirm `<button type="submit">` and a Cancel `<button type="submit">` placed inside a single `<form method="post" action="/expenses/confirm-create-category">` with hidden inputs for `description`, `amount` (raw user-typed string), `date`, and `category` (the new name). The two buttons are distinguished by `name="action"` with values `confirm` / `cancel`. Add `data-testid`s `confirm-create-category-page`, `confirm-create-category-confirm`, and `confirm-create-category-cancel` following the project's `name-action` convention.
**Depends on**: 6

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the DaisyUI/Tailwind conventions used in `src/routes/build-layout.tsx`. Do not write any client-side JS — the page must work submit-only. Format the previewed amount with the existing `formatCents` helper from `src/lib/money.ts`.

---

### 8. Wire POST handlers for the no-match → confirmation flow

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` POST handler is updated as follows: after `parseExpenseCreate` returns ok, instead of using the submitted `categoryId`, look up the typed `category` value via `findCategoryByName` (task 1). If a match exists, call `createExpense` with that id (existing behavior). If not, validate the new-category name via `parseNewCategoryName` (task 4); on length/empty error, redirect back to `/expenses` using `redirectWithFormErrors` from Issue 04 task 4, surfacing the error under the `category` field and preserving every other typed value. Otherwise, render the confirmation page from task 7 directly (no redirect) seeded with the typed values and the normalized new-category name.

A new POST route at `/expenses/confirm-create-category` (registered in the same file or in a sibling file alongside `build-expenses.tsx`, mounted under the same router) reads `action`, `description`, `amount`, `date`, and `category` from the body. On `action=confirm`, re-run `parseExpenseCreate` and `parseNewCategoryName` defensively; on success call `createCategoryAndExpense` (task 2) and redirect to `/expenses` with `redirectWithMessage`; on failure or DB error, redirect to `/expenses` with `redirectWithFormErrors` carrying the appropriate field error and preserving the typed values. On `action=cancel`, redirect to `/expenses` with `redirectWithFormErrors` carrying an empty `fieldErrors` object and the typed values so every field — including the typed new-category name — is restored via `value`.
**Depends on**: 1, 2, 4, 7, Issue 04 tasks 4 and 5

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Reuse `signedInAccess` for both routes. Do not return inline HTML for validation failures — always go through the redirect-with-payload helper. Keep handlers small; extract a small helper that builds the confirmation-page props if it improves readability.

---

### 9. Playwright e2e for the inline-category flow

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` (e.g. `04-inline-category-creation.spec.ts`) that signs in, seeds at least one existing category, visits `/expenses`, and exercises:

1. Type a brand-new category name `Groceries` plus valid description/amount/date and submit. Assert: the URL reflects the entry-form POST result (still on `/expenses` or the confirm route per task 8 — assert the `confirm-create-category-page` testid is visible), and the page shows the lowercased "Create category 'groceries'" line plus a preview of the expense values.
2. From the confirmation page click `confirm-create-category-cancel`. Assert: redirected back to `/expenses`, the entry form is visible with every field — description, amount, date, and the typed `Groceries` value in the category input — preserved via `value`, and no new expense or category row was created.
3. Resubmit and click `confirm-create-category-confirm`. Assert: redirected to `/expenses`, the new expense row appears at the top of the list with category `groceries`, the form is cleared, and a subsequent submission using `groceries` (any case) for the category routes through the existing-match branch (no confirmation page) and creates the row directly.
4. Submit with a typed category name of `categoryNameMax + 1` chars (use the testing value). Assert: `expense-form-category-error` is visible on the entry form, no confirmation page is rendered, and every other typed field is preserved.
5. Submit with a category name that is whitespace-only. Assert: `expense-form-category-error` visible, no confirmation page.

After each error case, fix only the failing field and resubmit; assert the success path completes.
**Depends on**: 5, 8, Issue 04 task 6

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`. Select elements via the `data-testid`s introduced in tasks 6 and 7. Follow the structure of `e2e-tests/expenses/03-validation-errors.spec.ts`.

---

### 10. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `findCategoryByName` and `createCategoryAndExpense` helpers in `expense-access`, the `parseNewCategoryName` extension and `categoryNameMax` constant in `expense-validators`, the entry-form change from `<select>` to `<input>`, the consolidated confirmation page, and the `/expenses/confirm-create-category` POST route with its confirm/cancel branches. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 9

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link to the Issue 03 entry-form pages and the Issue 04 validators / redirect-payload pages. Append a single `## [YYYY-MM-DD] ingest | Issue 05: inline category creation (no-JS path)` entry to `log.md`.

---

### 11. Walkthrough

**Type**: WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/05-inline-category-creation/` covering the new DB helpers, the validator extension, the entry-form input change, the consolidated confirmation page, and the confirm/cancel POST handlers.
**Depends on**: 10

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 12. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 11

---
