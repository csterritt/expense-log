# build-edit-expense.tsx

**Source:** `src/routes/expenses/build-edit-expense.tsx`

## Purpose

Route builder for the expense edit and delete flows added in Issue 08. Wires the row-level Edit button (in `build-expenses.tsx`) to a pre-populated edit page that shares JSX with the create form, plus a consolidated *Confirm new items* page (re-using the Issue 06 renderer in `mode='edit'`) for any-new submissions, plus a single-step delete-confirmation page.

## Export

### `buildEditExpense(app): void`

Registers five routes, all gated by `signedInAccess` and wrapped in `secureHeaders` (`ALLOW_SCRIPTS_SECURE_HEADERS` for the edit GET that mounts the JS-on combobox + chip picker; `STANDARD_SECURE_HEADERS` everywhere else):

- `GET /expenses/:id/edit` — loads the expense via `getExpenseById`, plus categories via `listCategories` and tags via `listTags` (so the embedded JSON payloads light up the JS-on combobox + chip picker exactly as on the create page). Pre-populates an `ExpenseFormValues` object from the loaded row (description, amount via `formatCentsPlain`, date, category name, tag names joined alphabetically as a CSV) merged with any flash form-state. Renders the shared `renderExpenseForm({ mode: 'edit', action: '/expenses/:id/edit' })` plus a Delete anchor (`expense-edit-delete`) linking to `/expenses/:id/delete` and a Back-to-list anchor (`expense-edit-back`).
- `POST /expenses/:id/edit` — mirrors the create POST: validates with `parseExpenseCreate` + `parseTagCsv`, on failure round-trips every typed field via `redirectWithFormErrors` to `/expenses/:id/edit`. Verifies the row exists. Computes the new-category / new-tag diff via `findCategoryByName` + `findTagsByNames`. **All-existing path**: calls `updateExpenseWithTags` and on success `redirectWithMessage` to `/expenses` with `'Expense updated.'`. **Any-new path**: validates the new-category name via `parseNewCategoryName` when applicable, then renders `renderConfirmNewItems({ mode: 'edit', action: '/expenses/:id/confirm-edit-new' })`. **No DB writes yet** on this branch.
- `POST /expenses/:id/confirm-edit-new` — Cancel `redirectWithFormErrors` to `/expenses/:id/edit` preserving every typed value (raw `tags` CSV included). Confirm defensively re-runs `parseExpenseCreate`, `parseTagCsv`, `parseNewCategoryName` (when a new category is being created), re-resolves the diffs, then calls `updateManyAndExpense` in a single atomic batch. On collision it surfaces the friendly error under `category` (when a new category was being created) or otherwise `tags`. On success `redirectWithMessage` to `/expenses` with `'Expense updated.'`.
- `GET /expenses/:id/delete` — loads the expense via `getExpenseById` and renders a single-page confirmation with `data-testid='confirm-delete-expense-page'` showing date, description, formatted amount (`formatCents`), category name, and alphabetised tags (each labelled and given stable testids `confirm-delete-expense-{date,description,amount,category,tags}`). The Confirm button POSTs to `/expenses/:id/delete`; the Cancel anchor returns to `/expenses/:id/edit`.
- `POST /expenses/:id/delete` — calls `deleteExpense`. On success `redirectWithMessage` to `/expenses` with `'Expense deleted.'`; on failure `redirectWithError` with a generic friendly message.

### Internal helpers

- `requireId(c)` — coerces `c.req.param('id')` (typed `string | undefined`) to a defaulted string so downstream calls keep their narrow types.
- `editPath(id)`, `confirmEditNewPath(id)`, `deletePath(id)` — small string builders kept private to the module.
- `readRawBody(c)` — same shape as the create-flow helper: returns `{ description, amount, date, category, tags, action }` all coerced to defaulted strings.
- `renderEditPage({ expenseId, state, payloads })` — pure view helper. Wraps `renderExpenseForm` plus the Delete + Back anchors and the two `<script defer>` tags for the JS-on enhancements.
- `renderDeleteConfirm({ id, date, description, amountCents, categoryName, tagNames })` — pure view helper for the delete page.
- `buildEditState(loaded, flash)` — merges the loaded-row defaults (with `formatCentsPlain` on the amount and an alphabetised tags CSV) with any flash values; flash always overrides loaded values when present so post-error redirects re-render exactly what the user typed.
- `computeNewItemsDiff(categoryLookup, tagLookup, loweredTagNames)` — small private helper that splits the parsed lower-cased tag list into `existingTagIds` + `newTagNames` (case-insensitive lookup against `findTagsByNames`'s result) and surfaces whether the typed category was new. Shared between the edit POST and the confirm-edit POST.

## Cross-references

- [expense-form.md](expense-form.md) — `renderExpenseForm({ mode: 'edit' })` and `renderConfirmNewItems({ mode: 'edit' })`.
- [build-expenses.md](build-expenses.md) — sister route file (create + list); the Edit button in `renderExpenseTable` links here.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `getExpenseById`, `updateExpenseWithTags`, `updateManyAndExpense`, `deleteExpense`, `findCategoryByName`, `findTagsByNames`, `listCategories`, `listTags`.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagCsv`, `FieldErrors`.
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`, `readAndClearFormState`, `ExpenseFormValues`.
- [../../lib/money.md](../../lib/money.md) — `formatCents` (delete page), `formatCentsPlain` (edit-form seed).
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../constants.md](../../constants.md) — `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`, `ALLOW_SCRIPTS_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
