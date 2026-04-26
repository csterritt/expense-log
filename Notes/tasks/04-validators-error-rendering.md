# Tasks for #04: Expense validators + error rendering with state preservation

Parent issue: `Notes/issues/04-validators-error-rendering.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Create `expense-validators` module

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` exports valibot schemas covering the expense-create form for this slice — at minimum a `ExpenseCreateSchema` (or equivalently named) plus a `parseExpenseCreate(input): Result<ParsedExpenseCreate, FieldErrors>` helper that returns `Result.ok(parsed)` on success and `Result.err(fieldErrors)` on failure, where `FieldErrors` is `{ description?: string; amount?: string; date?: string; category?: string }`. The `parsed` shape exposes `{ description, amountCents, date, categoryId }` (i.e. the validators run `parseAmount` internally so callers don't repeat that work). Export `FieldErrors` and `ParsedExpenseCreate` as named types.
**Depends on**: Issue 03 tasks 1 (`parseAmount`), 3 (`listCategories`)

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the valibot usage and `safeParse`-driven error extraction style of `src/lib/validators.ts`. Use `true-myth/result` consistent with neighboring modules. Field-level error coverage:

- `description`: required, non-empty after trim, `<= descriptionMax` (re-export the same constant used by the entry form, or accept a max as a parameter — pick one and document it in the file header).
- `amount`: required, `parseAmount` ok branch — surface `parseAmount`'s error string verbatim on failure. Reject empty / non-numeric / zero / negative / `> 2` decimals / malformed comma placement (already covered by `parseAmount`).
- `date`: required, `isValidYmd` true. Reject missing and non-calendar dates (e.g. `2025-13-40`).
- `category` (`categoryId`): required, non-empty string. Existence-against-DB is enforced by `createExpense` and is out of scope here.

Compose per-field errors into a `FieldErrors` object rather than a single concatenated string; the POST handler will pass the whole object back to the form.

---

### 2. Unit tests for `expense-validators`

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` covers, for each field, a representative pass case and the failure cases enumerated in the issue:

- description: empty (fail), single char (pass), `descriptionMax` chars (pass), `descriptionMax + 1` chars (fail).
- amount: `1234.56` (pass → 123456 cents), `0` (fail), `-5` (fail), `1.234` (fail), `abc` (fail), empty (fail).
- date: `2024-02-29` (pass), missing (fail), `2025-13-40` (fail), `2024-04-31` (fail).
- category: non-empty (pass), empty string (fail).
- Combined: when multiple fields are invalid, `parseExpenseCreate` returns `Result.err` containing entries for **each** invalid field (not just the first).

**Depends on**: 1

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the test style of `tests/money.spec.ts` and `tests/et-date.spec.ts`. Assert presence of an error string per field, not exact wording (other than where the issue explicitly pins behavior).

---

### 3. Render field-level errors and preserve values in the entry form

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` updates the entry form to:

- Read `fieldErrors` and `formValues` (description, amount, date, categoryId) from the GET render context — sourced from a flash cookie or equivalent mechanism described in `Notes/non-functional-reqs/web-behavior.md`. When neither is present, render defaults (date = `todayEt()`, others empty).
- For each field, when `fieldErrors[field]` is set, render a DaisyUI error message immediately after that input (e.g. `<p class="text-error" data-testid="expense-form-{field}-error">{message}</p>`).
- Use `value={formValues.description ?? ''}`, `value={formValues.amount ?? ''}`, `value={formValues.date ?? todayEt()}`, and on the `<select>` mark the `<option>` whose value matches `formValues.categoryId` as `selected` — never use `defaultValue`.
- Apply DaisyUI input-error styling (e.g. `input-error` / `select-error`) to inputs whose field has an error, so the visual error state is obvious.

**Depends on**: 1, Issue 03 task 8 (entry form rendered)

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Reuse the `descriptionMax` constant defined for the form in Issue 03 task 8 (`PRODUCTION:UNCOMMENT` pattern). Keep the JSX small — extract a per-field render helper if it improves readability. Do not introduce client-side JS for this; the error rendering must work without JS.

---

### 4. Carry field errors and prior values across the redirect

**Type**: WRITE
**Output**: A small helper alongside the existing flash helpers (or extending them) that lets the POST handler stash `{ fieldErrors, formValues }` into a single-use cookie that the next `/expenses` GET reads and clears. If the project already has a generic flash-payload helper (search for `redirectWithError` and any sibling "redirect with payload" / "form state" helpers before adding new code), use that. Otherwise add `redirectWithFormErrors(c, path, fieldErrors, formValues)` and a matching reader used by the GET handler. Cookie must be `HttpOnly`, `SameSite=Lax`, `Secure` in production, and consumed exactly once.
**Depends on**: 3

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Match the cookie names / clearing pattern of `redirectWithError` so behavior stays consistent. Keep the payload size small (single JSON-encoded object). Do not put the payload on the URL.

---

### 5. Wire validators into the POST handler

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` POST handler now calls `parseExpenseCreate` from task 1. On `Result.err(fieldErrors)`, redirect back to `/expenses` via the helper from task 4, passing `fieldErrors` plus the raw submitted values for `description`, `amount`, `date`, `categoryId`. On `Result.ok`, behavior is unchanged from Issue 03 (call `createExpense`, redirect with success flash). On `createExpense` failure, continue to use `redirectWithError` as before — that path is not field-level.
**Depends on**: 1, 4, Issue 03 task 9

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Replace the single composed-error redirect introduced in Issue 03 task 9 with the field-error redirect; do not return inline HTML. Keep the handler small.

---

### 6. Playwright e2e for field-level errors with preservation

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` (e.g. `03-validation-errors.spec.ts`) that signs in, seeds at least two categories via `seedCategories`, visits `/expenses`, and exercises:

1. Submit with description empty + valid amount/date/category. Assert: `expense-form-description-error` is visible; description input is empty; amount/date/category inputs retain the typed values; URL is `/expenses`; no new row was created.
2. Submit with description of `descriptionMax + 1` chars. Assert: description error visible; other fields preserved.
3. Submit with amount `1.234` + valid other fields. Assert: `expense-form-amount-error` visible; description/date/category preserved.
4. Submit with amount `-5`. Assert amount error.
5. Submit with amount `0`. Assert amount error.
6. Submit with amount `abc`. Assert amount error.
7. Submit with date `2025-13-40` + valid others. Assert: `expense-form-date-error` visible; other fields preserved. (Note: native `<input type="date">` may reject this in the browser — submit by setting the value via a form-level approach the spec already uses, or by clearing `type=date` to `type=text` for this spec, whichever the existing harness supports. If neither is feasible, skip date `2025-13-40` and instead assert via empty date input.)
8. Submit with category placeholder selected (no real category) + valid others. Assert: `expense-form-category-error` visible; other fields preserved.
9. Submit with multiple invalid fields at once. Assert that errors appear for **each** invalid field simultaneously and each valid field's value is preserved.

After each error case, fix only the failing field and resubmit; assert the row is created and the form clears.
**Depends on**: 2, 5, Issue 03 task 11 (entry form e2e + helpers)

Read and follow the non-functional requirements under `Notes/non-functional-reqs/`. Reuse `seedCategories` and sign-in helpers from `e2e-tests/support/`. Select error elements via the `expense-form-{field}-error` `data-testid`s introduced in task 3.

---

### 7. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `expense-validators` module and its schemas / `parseExpenseCreate` helper / `FieldErrors` type, the field-level error rendering and value preservation on the `/expenses` entry form, and the new `redirectWithFormErrors`-style helper (or the extension to existing flash helpers) introduced in task 4. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 6

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link to the Issue 03 entry-form pages and to `src/lib/money.ts` / `src/lib/et-date.ts` pages from Issue 02. Append a single `## [YYYY-MM-DD] ingest | Issue 04: validators + error rendering` entry to `log.md`.

---

### 8. Walkthrough

**Type**: WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/04-validators-error-rendering/` covering `expense-validators`, the field-level error rendering with state preservation on `/expenses`, and the redirect-payload helper.
**Depends on**: 7

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 9. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 8

---
