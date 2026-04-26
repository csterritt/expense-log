# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expenses page (`/expenses`) — the post-sign-in landing page that replaced the legacy `/private` route. Issue 02 added the date-filtered list rendering. Issue 03 added the entry form and POST handler. Issue 04 replaced the local `validateExpenseForm` helper with the shared [`parseExpenseCreate`](../../lib/expense-validators.md) and added per-field error rendering plus sticky values via the [`form-state`](../../lib/form-state.md) flash helper.

## Export

### `buildExpenses(app): void`

Registers two routes, both gated by `signedInAccess` and wrapped in `secureHeaders(STANDARD_SECURE_HEADERS)`:

- `GET /expenses` — renders the entry form (with any flashed errors / sticky values applied) above the empty state or list table.
- `POST /expenses` — delegates to `parseExpenseCreate`, redirects with form-errors on failure, creates + redirects with success message on success.

### Internal helpers

- `fieldError(field, message?)` — returns a DaisyUI `text-error` `<p data-testid='expense-form-{field}-error'>` element, or `null` if there's no message for that field.
- `inputClass(base, hasError)` / `selectClass(base, hasError)` — append `input-error` / `select-error` to the base class when the field has an error.
- `renderEntryForm(categories, state)` — pure view helper; reads `state.fieldErrors` and `state.values` to render inputs with `value={...}` (never `defaultValue`) and the `<select>`'s matching option marked `selected`. The form carries `noValidate` so server-side validation owns the UX.
- `emptyState(today)` — default entry-form state for first-page loads and post-success redirects.

### GET behaviour

1. Calls `defaultRangeEt()` to compute the default `[from, to]` window (current month plus the previous two ET months).
2. Runs `listExpenses(db, range)` and `listCategories(db)` in parallel.
3. If either `Result` is `Err`, calls `redirectWithError` to send the user to `/auth/sign-in` with the message `'Failed to load expenses. Please try again.'`.
4. Calls `readAndClearFormState(c)` to consume any single-use flash payload set by a prior failed POST. If present, its `fieldErrors` and `values` populate the form state (with the date value falling back to `todayEt()` when the flash didn't include one).
5. Renders the entry form above the empty state or list table.

### POST behaviour

1. `parseBody()` reads `description`, `amount`, `date`, `categoryId` from the form (coerced to `string` defensively).
2. Calls `parseExpenseCreate(raw)`.
3. On `Err`: `redirectWithFormErrors(c, PATHS.EXPENSES, errors, raw)` — stashes `{ fieldErrors, values }` in the single-use `FORM_ERRORS` cookie and PRG-redirects back to `/expenses`.
4. On `Ok`: `createExpense(db, validated.value)`.
   - On DB failure: `redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')` (still uses the simpler single-string flash).
   - On success: `redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')`.

### Page content

- `data-testid='expenses-page'` wrapper.
- `<h1>Expenses</h1>`.
- Entry form (`data-testid='expense-form'`, `method='post'`, `action='/expenses'`, `noValidate`) with fields:
  - `expense-form-description` — `text`, `required`, `maxLength={descriptionMax + 50}` (intentionally larger than the server-side cap so tests can submit over-limit strings without browser truncation).
  - `expense-form-amount` — `text`, `inputmode='decimal'`, `required`.
  - `expense-form-date` — `text`, `required`, `pattern='\d{4}-\d{2}-\d{2}'`, placeholder `'YYYY-MM-DD'`. Uses `type='text'` rather than `type='date'` so the server can see and reject impossible calendar dates like `2025-13-40`.
  - `expense-form-category` — `<select>` with `required` and a `disabled`/`selected` placeholder option, followed by one `<option>` per category from `listCategories`. The matching option is marked `selected` when the flashed state has a sticky `categoryId`.
  - `expense-form-create` — submit button.
  - Each field also renders `expense-form-{field}-error` next to the input when a matching error is present (`description`, `amount`, `date`, `category`).
- Below the form: empty state (`expenses-empty-state`) when there are no rows, otherwise the Issue 02 `expenses-table` with `expense-row`/`expense-row-*` cells.
- The global flash-message banner rendered by `useLayout` still fires for success (`Expense added.`) and DB-error paths; per-field validation errors are now rendered inline at the inputs rather than as a single combined banner.

## Cross-references

- [../../lib/et-date.md](../../lib/et-date.md) — `defaultRangeEt`, `todayEt`, `isValidYmd`
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `listExpenses`, `listCategories`, `createExpense`
- [../../lib/money.md](../../lib/money.md) — `formatCents` (list), `parseAmount` (via `expense-validators`)
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseExpenseCreate`, `descriptionMax`, `FieldErrors`
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`, `readAndClearFormState`, `ExpenseFormValues`
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`
- [../build-layout.md](../build-layout.md) — layout wrapper (renders the single-string flash banner)
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`, `COOKIES.FORM_ERRORS`
- [../auth/better-auth-response-interceptor.md](../auth/better-auth-response-interceptor.md) — redirects verified sign-ins here
- [../../lib/auth.md](../../lib/auth.md) — `redirectTo: '/expenses'` in better-auth config

---

See [source-code.md](../../../source-code.md) for the full catalog.
