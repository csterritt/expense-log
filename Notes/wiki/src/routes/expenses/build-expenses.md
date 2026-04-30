# build-expenses.tsx

**Source:** `src/routes/expenses/build-expenses.tsx`

## Purpose

Route builder for the expenses page (`/expenses`) — the post-sign-in landing page that replaced the legacy `/private` route. Issue 02 added the date-filtered list rendering. Issue 03 added the entry form and POST handler. Issue 04 replaced the local `validateExpenseForm` helper with the shared [`parseExpenseCreate`](../../lib/expense-validators.md) and added per-field error rendering plus sticky values via the [`form-state`](../../lib/form-state.md) flash helper. Issue 05 swapped the category `<select>` for a free-form text input and added the inline-category-creation flow: typed names that don't match an existing category route through a consolidated confirmation page before any DB writes happen. Issue 06 added a tags CSV input alongside the category input, generalised the confirmation page to a *Confirm new items* view that lists every new name (categories + tags) the submission would create, and renamed the confirm POST to `/expenses/confirm-create-new`. Issue 08 extracted the entry-form JSX and the *Confirm new items* JSX into the shared [`expense-form.tsx`](expense-form.md) module (so the new edit flow can reuse them in `mode='edit'`), added a row-level Edit button (`expense-row-edit`) per list row that links to `/expenses/:id/edit`, and added a corresponding empty `<th></th>` to keep the header column count aligned.

## Export

### `buildExpenses(app): void`

Registers three routes, all gated by `signedInAccess` and wrapped in `secureHeaders(STANDARD_SECURE_HEADERS)`:

- `GET /expenses` — renders the entry form (with any flashed errors / sticky values applied) above the empty state or list table. The list rows now include alphabetised tags (Issue 06).
- `POST /expenses` — validates the five fields (the four originals plus `tags` CSV), looks up the typed `category` and tag names. When everything already exists, calls `createExpenseWithTags` directly. When anything is new, runs `parseNewCategoryName` if needed and renders the consolidated confirmation page (no DB writes yet).
- `POST /expenses/confirm-create-new` — handles Confirm and Cancel from the confirmation page. Confirm re-validates every field defensively, then issues an atomic `createManyAndExpense` (creates the optional new category, every new tag, the expense, and every `expenseTag` link in a single `db.batch`) and PRG-redirects with `'Expense added.'`. Cancel rounds-trips every typed value — including the **raw** typed tag CSV — back to the entry form via `redirectWithFormErrors(c, PATHS.EXPENSES, {}, values)`.

### Internal helpers

- The entry-form and confirm-page JSX live in [`expense-form.tsx`](expense-form.md) as of Issue 08; this module just calls `renderExpenseForm({ mode: 'create', action: PATHS.EXPENSES, ... })` and `renderConfirmNewItems({ mode: 'create', action: '/expenses/confirm-create-new', ... })`. The previous `renderEntryForm` / `renderConfirmCreateNew` private helpers were removed in that refactor.
- `renderExpenseTable(rows)` — pure view helper. Each row is an `expense-row` with cells for `expense-row-{date,description,category,tags,amount}` plus (Issue 08) a final cell containing `<a data-testid='expense-row-edit' href='/expenses/:id/edit' class='btn btn-sm'>Edit</a>`. The table header carries an empty `<th></th>` to balance the column count.
- `readRawBody(c)` — small helper that runs `c.req.parseBody()` and coerces each known field (`description`, `amount`, `date`, `category`, `tags`, `action`) to a defaulted string.
- `emptyState(today)` — default entry-form state for first-page loads and post-success redirects.

### GET behaviour

1. Calls `defaultRangeEt()` to compute the default `[from, to]` window (current month plus the previous two ET months).
2. Runs `listExpenses(db, range)` only — Issue 05 removed the `listCategories` call because the category field is now a free-form text input.
3. If the `Result` is `Err`, calls `redirectWithError` to send the user to `/auth/sign-in` with the message `'Failed to load expenses. Please try again.'`.
4. Calls `readAndClearFormState(c)` to consume any single-use flash payload set by a prior failed POST or Cancel. If present, its `fieldErrors` and `values` populate the form state (with the date value falling back to `todayEt()` when the flash didn't include one).
5. Renders the entry form above the empty state or list table.

### POST `/expenses` behaviour

1. `readRawBody(c)` reads `description`, `amount`, `date`, `category`, `tags` from the form.
2. `parseExpenseCreate(raw)` and `parseTagCsv(raw.tags)` run together. On either `Err`: combine into a single `FieldErrors` and `redirectWithFormErrors` and stop.
3. `findCategoryByName(db, validated.value.category)` and `findTagsByNames(db, tagParse.value)`.
   - DB failure on either: `redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')`.
   - Compute the existing-vs-new diff for both category and tags.
   - **All-existing path** (no new category, no new tag names): `createExpenseWithTags(db, { ...validated.value, categoryId, tagIds: existingTagIds })`. On success → `redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')`.
   - **Any-new path**: when the category is new, run `parseNewCategoryName` first (over-max / whitespace-only short-circuits to `redirectWithFormErrors` with `{ category: err }`, never rendering the confirmation page). Otherwise no extra validation. Then `c.render(useLayout(c, renderConfirmCreateNew({ newCategoryName, finalCategoryName, newTagNames, finalTagNames, values: rawValues })))`. **No DB writes yet.** Tag names on the page are alphabetised; the raw typed CSV is round-tripped via the form's hidden `tags` input so Cancel restores it byte-for-byte.

### POST `/expenses/confirm-create-new` behaviour

1. `readRawBody(c)` reads the five fields plus `action` (`'confirm'` or `'cancel'`).
2. If `action === 'cancel'`: `redirectWithFormErrors(c, PATHS.EXPENSES, {}, rawValues)` — round-trips every typed value (including the raw `tags` CSV) back to the entry form with no field errors. No DB writes.
3. Otherwise (`'confirm'`): re-runs `parseExpenseCreate` and `parseTagCsv` defensively (the user could have tampered with hidden inputs); on either failure combines the errors and flashes them back to `/expenses`.
4. Re-resolves the category and tag diffs via `findCategoryByName` + `findTagsByNames`. When the category is new, re-runs `parseNewCategoryName`.
5. Calls `createManyAndExpense(db, { newCategoryName, existingCategoryId, newTagNames, existingTagIds, ... })` which inserts everything in a single `db.batch([...])` (atomic). A unique-name collision flashes `{ category: msg }` when a new category was being created and `{ tags: msg }` otherwise.
6. On success: `redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')`.

### Page content

- `data-testid='expenses-page'` wrapper.
- `<h1>Expenses</h1>`.
- Entry form (`data-testid='expense-form'`, `method='post'`, `action='/expenses'`, `noValidate`) with fields:
  - `expense-form-description` — `text`, `required`, `maxLength={descriptionMax + 50}` (intentionally larger than the server-side cap so tests can submit over-limit strings without browser truncation).
  - `expense-form-amount` — `text`, `inputmode='decimal'`, `required`.
  - `expense-form-date` — `text`, `required`, `pattern='\d{4}-\d{2}-\d{2}'`, placeholder `'YYYY-MM-DD'`. Uses `type='text'` rather than `type='date'` so the server can see and reject impossible calendar dates like `2025-13-40`.
  - `expense-form-category` — Issue 05 replaced the `<select>` with a `text` input named `category`. `required`, `maxLength={categoryNameMax + 50}` (so tests can exercise over-max submissions), placeholder `'Type a category'`. Sticky value comes straight from `state.values.category`.
  - `expense-form-tags` — Issue 06 added a single text input named `tags` (CSV). Optional, `maxLength={(tagNameMax + 2) * 8}` (sized for ~8 max-length tags + separators), placeholder `'e.g. food, groceries'`. Sticky value comes straight from `state.values.tags` (the raw typed CSV, including duplicates and original casing).
  - `expense-form-create` — submit button.
  - Each field also renders `expense-form-{field}-error` next to the input when a matching error is present (`description`, `amount`, `date`, `category`, `tags`).
- Below the form: empty state (`expenses-empty-state`) when there are no rows, otherwise the Issue 02 `expenses-table` with `expense-row`/`expense-row-*` cells. Each row's `expense-row-tags` cell shows the alphabetised tag list (or empty span when no tags).
- Confirmation page (rendered inline on any-new POSTs, no redirect): `confirm-create-new-page` wrapper, `confirm-create-new-list` containing zero-or-one `confirm-create-new-category-line` and zero-or-more alphabetised `confirm-create-new-tag-line`s, five `confirm-create-new-{description,amount,date,category,tags}` `<dd>`s mirror the typed/normalised values, and the form's two submit buttons share `name='action'` with values `'confirm'` and `'cancel'` (testids `confirm-create-new-confirm` and `confirm-create-new-cancel`).
- The global flash-message banner rendered by `useLayout` still fires for success (`Expense added.`) and generic DB-error paths; per-field validation errors are rendered inline at the inputs rather than as a single combined banner.

## Cross-references

- [../../lib/et-date.md](../../lib/et-date.md) — `defaultRangeEt`, `todayEt`, `isValidYmd`
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `listExpenses`, `createExpense`, `findCategoryByName`, `findTagsByNames`, `createExpenseWithTags`, `createManyAndExpense`
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
