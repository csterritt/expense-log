# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expenses page (`/expenses`) — the post-sign-in landing page that replaced the legacy `/private` route. Issue 02 added the date-filtered list rendering. Issue 03 added the entry form and POST handler. Issue 04 replaced the local `validateExpenseForm` helper with the shared [`parseExpenseCreate`](../../lib/expense-validators.md) and added per-field error rendering plus sticky values via the [`form-state`](../../lib/form-state.md) flash helper. Issue 05 swapped the category `<select>` for a free-form text input and added the inline-category-creation flow: typed names that don't match an existing category route through a consolidated confirmation page before any DB writes happen.

## Export

### `buildExpenses(app): void`

Registers three routes, all gated by `signedInAccess` and wrapped in `secureHeaders(STANDARD_SECURE_HEADERS)`:

- `GET /expenses` — renders the entry form (with any flashed errors / sticky values applied) above the empty state or list table.
- `POST /expenses` — validates the four fields, looks up the typed `category` name. If it matches an existing row, calls `createExpense` directly. If it doesn't match, runs `parseNewCategoryName` and renders the consolidated confirmation page (no DB writes yet).
- `POST /expenses/confirm-create-category` — handles Confirm and Cancel from the confirmation page. Confirm re-validates every field defensively, then issues an atomic `createCategoryAndExpense` and PRG-redirects with `'Expense added.'`. Cancel rounds-trips every typed value back to the entry form via `redirectWithFormErrors(c, PATHS.EXPENSES, {}, values)`.

### Internal helpers

- `fieldError(field, message?)` — returns a DaisyUI `text-error` `<p data-testid='expense-form-{field}-error'>` element, or `null` if there's no message for that field.
- `inputClass(base, hasError)` — appends `input-error` to the base class when the field has an error. (The Issue 04 `selectClass` helper was removed when the category select became a plain text input in Issue 05.)
- `renderEntryForm(state)` — pure view helper; reads `state.fieldErrors` and `state.values` to render inputs with `value={...}` (never `defaultValue`). The form carries `noValidate` so server-side validation owns the UX.
- `renderConfirmCreateCategory({ normalizedName, values })` — pure view helper for the Issue 05 confirmation page; renders the prompt (`Create category 'name' and add this expense?`), a `<dl>` mirroring the four fields, and a single `<form>` with hidden inputs plus Confirm/Cancel submit buttons that share a single `name='action'`.
- `readRawBody(c)` — small helper that runs `c.req.parseBody()` and coerces each known field (`description`, `amount`, `date`, `category`, `action`) to a defaulted string.
- `emptyState(today)` — default entry-form state for first-page loads and post-success redirects.

### GET behaviour

1. Calls `defaultRangeEt()` to compute the default `[from, to]` window (current month plus the previous two ET months).
2. Runs `listExpenses(db, range)` only — Issue 05 removed the `listCategories` call because the category field is now a free-form text input.
3. If the `Result` is `Err`, calls `redirectWithError` to send the user to `/auth/sign-in` with the message `'Failed to load expenses. Please try again.'`.
4. Calls `readAndClearFormState(c)` to consume any single-use flash payload set by a prior failed POST or Cancel. If present, its `fieldErrors` and `values` populate the form state (with the date value falling back to `todayEt()` when the flash didn't include one).
5. Renders the entry form above the empty state or list table.

### POST `/expenses` behaviour

1. `readRawBody(c)` reads `description`, `amount`, `date`, `category` from the form.
2. `parseExpenseCreate(raw)`. On `Err`: `redirectWithFormErrors(c, PATHS.EXPENSES, errors, rawValues)` and stop.
3. `findCategoryByName(db, validated.value.category)`.
   - DB failure: `redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')`.
   - Match: `createExpense(db, { ...validated.value, categoryId: lookup.value.id })`. On success → `redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')`. On DB failure → generic redirect-with-error.
   - No match: `parseNewCategoryName(validated.value.category)`.
     - On `Err`: `redirectWithFormErrors` with `{ category: err }`. (Catches the over-max / whitespace-only cases without ever rendering the confirmation page.)
     - On `Ok`: lowercase the trimmed name and `c.render(useLayout(c, renderConfirmCreateCategory({ normalizedName, values: rawValues })))`. **No DB writes yet.**

### POST `/expenses/confirm-create-category` behaviour

1. `readRawBody(c)` reads the four fields plus `action` (`'confirm'` or `'cancel'`).
2. If `action === 'cancel'`: `redirectWithFormErrors(c, PATHS.EXPENSES, {}, rawValues)` — round-trips every typed value back to the entry form with no field errors. No DB writes.
3. Otherwise (`'confirm'`): re-runs `parseExpenseCreate` and `parseNewCategoryName` defensively (the user could have tampered with hidden inputs). Either failure flashes the matching `FieldErrors` back to `/expenses`.
4. Calls `createCategoryAndExpense(db, { newCategoryName: nameCheck.value, ... })`. The helper inserts both rows in a single `db.batch([...])` so failure on either rolls the other back. A unique-name collision (e.g. another tab created the same name in the meantime) flashes `{ category: createResult.error.message }` back to the entry form.
5. On success: `redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')`.

### Page content

- `data-testid='expenses-page'` wrapper.
- `<h1>Expenses</h1>`.
- Entry form (`data-testid='expense-form'`, `method='post'`, `action='/expenses'`, `noValidate`) with fields:
  - `expense-form-description` — `text`, `required`, `maxLength={descriptionMax + 50}` (intentionally larger than the server-side cap so tests can submit over-limit strings without browser truncation).
  - `expense-form-amount` — `text`, `inputmode='decimal'`, `required`.
  - `expense-form-date` — `text`, `required`, `pattern='\d{4}-\d{2}-\d{2}'`, placeholder `'YYYY-MM-DD'`. Uses `type='text'` rather than `type='date'` so the server can see and reject impossible calendar dates like `2025-13-40`.
  - `expense-form-category` — Issue 05 replaced the `<select>` with a `text` input named `category`. `required`, `maxLength={categoryNameMax + 50}` (so tests can exercise over-max submissions), placeholder `'Type a category'`. Sticky value comes straight from `state.values.category`.
  - `expense-form-create` — submit button.
  - Each field also renders `expense-form-{field}-error` next to the input when a matching error is present (`description`, `amount`, `date`, `category`).
- Below the form: empty state (`expenses-empty-state`) when there are no rows, otherwise the Issue 02 `expenses-table` with `expense-row`/`expense-row-*` cells.
- Confirmation page (rendered inline on no-match POSTs, no redirect): `confirm-create-category-page` wrapper, `confirm-create-category-name` shows `'<lowercased-name>'`, four `confirm-create-category-{description,amount,date,category}` `<dd>`s mirror the typed values, and the form's two submit buttons share `name='action'` with values `'confirm'` and `'cancel'` (testids `confirm-create-category-confirm` and `confirm-create-category-cancel`).
- The global flash-message banner rendered by `useLayout` still fires for success (`Expense added.`) and generic DB-error paths; per-field validation errors are rendered inline at the inputs rather than as a single combined banner.

## Cross-references

- [../../lib/et-date.md](../../lib/et-date.md) — `defaultRangeEt`, `todayEt`, `isValidYmd`
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `listExpenses`, `createExpense`, `findCategoryByName`, `createCategoryAndExpense`
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
