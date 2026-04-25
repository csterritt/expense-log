# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expenses page (`/expenses`) — the post-sign-in landing page that replaced the legacy `/private` route. Issue 02 added the date-filtered list rendering. Issue 03 added the entry form at the top of the page and the `POST /expenses` handler that creates new expenses (existing categories only, no tags yet).

## Export

### `buildExpenses(app): void`

Registers two routes, both gated by `signedInAccess` and wrapped in `secureHeaders(STANDARD_SECURE_HEADERS)`:

- `GET /expenses` — renders the entry form + (optional) list table.
- `POST /expenses` — validates form input, calls `createExpense`, redirects via PRG.

### Local constants

- `descriptionMax` — follows the `Notes/non-functional-reqs/coding-style.md` PRODUCTION-comment pattern: `200` in production, `202` for testing so browsers don't auto-truncate values used to exercise the length cap.

### GET behaviour

1. Calls `defaultRangeEt()` to compute the default `[from, to]` window (current month plus the previous two ET months).
2. Runs `listExpenses(db, range)` and `listCategories(db)` in parallel.
3. If either `Result` is `Err`, calls `redirectWithError` to send the user to `/auth/sign-in` with the message `'Failed to load expenses. Please try again.'`.
4. Otherwise renders the entry form (always) above the empty-state or the list table, using `todayEt()` for the date input default.

### POST behaviour

1. `parseBody()` reads `description`, `amount`, `date`, `categoryId` from the form.
2. `validateExpenseForm` (local helper) runs:
   - description trimmed and non-empty, `<= descriptionMax`,
   - `isValidYmd(date)`,
   - `categoryId` non-empty,
   - `parseAmount(amount)` returning `Result<number, string>`.
3. On any validation failure: `redirectWithError(c, '/expenses', message)` (PRG with the composed error in the flash cookie).
4. On success: `createExpense(db, validated.value)`. If that returns `Err`, redirect with `'Failed to save expense. Please try again.'`. If it returns `Ok`, redirect with `redirectWithMessage(c, '/expenses', 'Expense added.')` so the next GET shows a success banner and a cleared form.

### Page content

- `data-testid='expenses-page'` wrapper.
- `<h1>Expenses</h1>`.
- Entry form (`data-testid='expense-form'`, `method='post'`, `action='/expenses'`) with fields:
  - `expense-form-description` — `text`, `required`, `maxLength=descriptionMax`.
  - `expense-form-amount` — `text`, `inputmode='decimal'`, `required`.
  - `expense-form-date` — `type='date'`, `required`, `value={todayEt()}`.
  - `expense-form-category` — `<select>` with a disabled placeholder option followed by one `<option value={cat.id}>{cat.name}</option>` per row from `listCategories`.
  - `expense-form-create` — submit button.
- Below the form: empty state (`expenses-empty-state`) when there are no rows, otherwise the Issue 02 `expenses-table` with `expense-row`/`expense-row-*` cells.
- Flash messages are rendered by `useLayout` from the `MESSAGE_FOUND`/`ERROR_FOUND` cookies set by `redirectWithMessage`/`redirectWithError`.

## Cross-references

- [../../lib/et-date.md](../../lib/et-date.md) — `defaultRangeEt`
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `listExpenses`, `listCategories`, `createExpense`, `ExpenseRow`, `CategoryRow`
- [../../lib/money.md](../../lib/money.md) — `formatCents`, `parseAmount`
- [../../lib/et-date.md](../../lib/et-date.md) — `todayEt`, `isValidYmd`
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`
- [../build-layout.md](../build-layout.md) — layout wrapper
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`
- [../auth/better-auth-response-interceptor.md](../auth/better-auth-response-interceptor.md) — redirects verified sign-ins here
- [../../lib/auth.md](../../lib/auth.md) — `redirectTo: '/expenses'` in better-auth config

---

See [source-code.md](../../../source-code.md) for the full catalog.
