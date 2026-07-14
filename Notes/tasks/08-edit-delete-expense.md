# Tasks for #08: Edit and delete expense

Parent issue: `Notes/issues/08-edit-delete-expense.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add `getExpenseById` to `expense-access`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `getExpenseById(db, id: string): Promise<Result<(ExpenseRow & { tagIds: string[] }) | null, Error>>` that returns the full expense (id, date, description, amountCents, categoryId, categoryName, tagIds, tagNames sorted alphabetically) or `null` when the row does not exist. Wrap with `withRetry` consistent with the other helpers in this file.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the drizzle import style and `Result` wrapping pattern already used by `listExpenses` in the same file. Reuse the existing join shape (`expense` ⨝ `category` ⨝ `expenseTag` ⨝ `tag`) and aggregate tag names + ids per expense. Keep the helper HTTP-agnostic.

---

### 2. Unit test for `getExpenseById`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `getExpenseById`: returns `ok(null)` for an unknown id; returns the full row including the resolved category name and the alphabetized `tagNames` / `tagIds` for a seeded expense with two tags; returns the row with empty `tagNames` / `tagIds` for an expense with no tag links.
**Depends on**: 1

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse whatever test-DB harness the Issue 05 / Issue 06 helper tests use — do not invent a new harness. If those tests deferred DB assertions to e2e, mirror that decision here and document it in the file header.

---

### 3. Add `updateExpenseWithTags` atomic helper

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `updateExpenseWithTags(db, input: { id: string; date: string; description: string; amountCents: number; categoryId: string; tagIds: string[] }): Promise<Result<{ id: string }, Error>>` that runs a single drizzle transaction which: updates the `expense` row's `date`, `description`, `amountCents`, `categoryId`, and `updatedAt`; deletes every `expenseTag` row where `expenseId = input.id`; inserts one `expenseTag` row per id in `tagIds` (de-duplicated). Returns the expense id on success; returns `Result.err` with a friendly message when the expense does not exist. Wrap with `withRetry`.
**Depends on**: 1

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Build on top of the `createExpenseWithTags` pattern: reuse the same `db.transaction(...)` shape and `withRetry` outer wrapper. Keep the helper HTTP-agnostic.

---

### 4. Unit test for `updateExpenseWithTags`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `updateExpenseWithTags`: replaces the field values and the full tag set (removing old tags not in the new list, adding new ones); is idempotent when called with the same `tagIds` twice (no duplicate links); de-duplicates duplicate ids in the input; returns `Result.err` for an unknown id with neither the row nor any tag links mutated.
**Depends on**: 3

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse the same test-DB harness used in tasks 2 and the Issue 06 helper tests.

---

### 5. Add `updateManyAndExpense` atomic helper

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `updateManyAndExpense(db, input: { id: string; newCategoryName: string | null; existingCategoryId: string | null; newTagNames: string[]; existingTagIds: string[]; date: string; description: string; amountCents: number }): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>>` that runs a single drizzle transaction mirroring `createManyAndExpense` but updating an existing expense instead of creating one: optionally inserts a new `category` row when `newCategoryName` is non-null and uses its id; inserts a new `tag` row for each entry in `newTagNames`; updates the existing `expense` row (date, description, amountCents, categoryId, updatedAt) referencing the resolved category id; replaces the `expenseTag` link set (delete all + insert combined existing + newly-created ids, de-duplicated). Exactly one of `newCategoryName` / `existingCategoryId` must be supplied. On unique-index collision (race on category or tag name) the transaction rolls back and a friendly `Result.err` is returned.
**Depends on**: 3, Issue 06 task 2

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse the `createManyAndExpense` pattern for transaction shape, id generation, and `withRetry` wrapping. Keep the helper HTTP-agnostic.

---

### 6. Unit test for `updateManyAndExpense`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `updateManyAndExpense`: updates the expense, creates a new category and a new tag, and links them alongside existing tag ids in one transaction; rolls back cleanly on a tag-name collision (asserting the expense and category rows are unchanged and no tag was inserted); rejects invalid inputs where both or neither of `newCategoryName` / `existingCategoryId` are supplied.
**Depends on**: 5

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse the same test-DB harness used in tasks 2 / 4.

---

### 7. Add `deleteExpense` helper

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `deleteExpense(db, id: string): Promise<Result<void, Error>>` that deletes the `expense` row by id; the existing `ON DELETE CASCADE` on `expenseTag` cleans up the link rows automatically. Returns `Result.err` with a friendly message when the row does not exist. Wrap with `withRetry`.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the drizzle import style and `Result` wrapping pattern already used by other helpers in this file. Keep the helper HTTP-agnostic.

---

### 8. Unit test for `deleteExpense`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `deleteExpense`: removes the expense and every `expenseTag` link for the seeded id; leaves the referenced `category` and `tag` rows intact; returns `Result.err` for an unknown id.
**Depends on**: 7

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse the same test-DB harness used in tasks 2 / 4 / 6.

---

### 9. Add an Edit button to each list row

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` extends each list row to include a final cell containing an anchor styled as a DaisyUI `btn btn-sm` linking to `/expenses/:id/edit`, with `data-testid="expense-row-edit"`. Add a corresponding `<th></th>` (empty header) so the table header column count matches. The list query / row shape is unchanged.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use a real anchor (`<a>`), not a button, so the no-JS path works. Match DaisyUI / Tailwind conventions used in the row already.

---

### 10. Extract a shared expense-form renderer

**Type**: WRITE
**Output**: A new module `src/routes/expenses/expense-form.tsx` exports `renderExpenseForm({ mode, action, state, payloads, expenseId? })` that produces the JSX form currently inlined as `renderEntryForm` in `build-expenses.tsx`. `mode` is `'create' | 'edit'`. The submit-button label is `Add expense` in create mode and `Save changes` in edit mode; the button's `data-testid` is `expense-form-create` in create mode and `expense-form-save` in edit mode. The form's `action` attribute is taken from the `action` prop. All other inputs (description, amount, date, category, tags) and their `value` bindings, error blocks, JSON payload `<script>` blocks, and the `data-category-combobox` / `data-tag-chip-picker` hooks are unchanged. `build-expenses.tsx` is updated to import and use the new renderer instead of its private copy.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the `value` attribute (not `defaultValue`). Keep the form submit-only — no client-side JS added in this task.

---

### 11. Build the edit page GET route

**Type**: WRITE
**Output**: A new route module `src/routes/expenses/build-edit-expense.tsx` registers `GET /expenses/:id/edit` (signed-in only). The handler loads the expense via `getExpenseById`, the categories via `listCategories`, and the tags via `listTags`. On a missing id it `redirectWithError` to `/expenses` with a "Expense not found." message. Otherwise it pre-populates an `ExpenseFormValues` object from the loaded row (date, description, raw amount formatted as a plain decimal string with no currency formatting via a small helper, category name, tag names joined as a CSV in alphabetical order) merged with any flash form-state (so post-error redirects re-fill what the user typed). It renders the shared form from task 10 in `mode='edit'` with `action="/expenses/:id/edit"` plus a Delete button (a real anchor with `data-testid="expense-edit-delete"`) linking to `/expenses/:id/delete`. Wire the new builder into the same place `buildExpenses` is wired.
**Depends on**: 1, 10

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use `redirectWithError` / `redirectWithMessage` from `src/lib/redirects.tsx` for any handler-level redirect. The amount-from-cents formatter for the input value must produce a plain number suitable for re-validation by `parseExpenseCreate` (e.g. `12.34`, no `$`, no commas) — extract a tiny helper next to `formatCents` in `src/lib/money.ts` if one does not already exist.

---

### 12. Wire POST `/expenses/:id/edit`

**Type**: WRITE
**Output**: The edit-route module from task 11 registers `POST /expenses/:id/edit` (signed-in only). The handler mirrors the create-flow POST logic in `build-expenses.tsx`: read the body, run `parseExpenseCreate` and `parseTagCsv`, on validation failure `redirectWithFormErrors` back to `/expenses/:id/edit` preserving every typed field. Verify the expense exists via `getExpenseById`; on a missing id `redirectWithError` to `/expenses`. Resolve the category via `findCategoryByName` and tags via `findTagsByNames`, compute the new-category / new-tag diff. If nothing is new, call `updateExpenseWithTags` with the resolved ids and on success `redirectWithMessage` to `/expenses` with "Expense updated."; on failure redirect with a friendly error. If anything is new, validate the new-category name via `parseNewCategoryName` when applicable and render the consolidated confirmation page (task 13) seeded with the raw typed values, the expense id, and the normalized new-category / new-tag lists.
**Depends on**: 1, 3, 5, 11, Issue 06 tasks 1, 2, 9

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse `signedInAccess`. Never return inline HTML for validation failures — always go through `redirectWithFormErrors`. Extract a shared private helper for the "compute new-items diff" step if it improves readability over duplicating Issue 06's POST logic.

---

### 13. Generalize the consolidated confirmation page for edit mode

**Type**: WRITE
**Output**: The "Confirm new items" page renderer is generalized so the same JSX serves both create and edit flows. Add a `mode: 'create' | 'edit'` prop plus an optional `expenseId` prop. The confirm form's `action` attribute is `/expenses/confirm-create-new` in create mode (unchanged) and `/expenses/:id/confirm-edit-new` in edit mode. The confirm button's label is `Confirm` in both modes; data-testids gain mode-specific variants `confirm-create-new-confirm` / `confirm-edit-new-confirm` (and `-cancel` likewise) following the project's `name-action` convention; the page-level testid likewise becomes `confirm-create-new-page` / `confirm-edit-new-page`. Hidden inputs carry `description`, `amount`, `date`, `category`, `tags` exactly as today; in edit mode they additionally carry the expense id (already in the URL — no extra hidden input needed). The list-of-new-items section is unchanged.
**Depends on**: 12

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the DaisyUI / Tailwind conventions already in the renderer. No client-side JS — submit-only.

---

### 14. Wire POST `/expenses/:id/confirm-edit-new`

**Type**: WRITE
**Output**: The edit-route module registers `POST /expenses/:id/confirm-edit-new` (signed-in only). The handler reads `action`, `description`, `amount`, `date`, `category`, `tags` from the body. On `action=cancel`, `redirectWithFormErrors` to `/expenses/:id/edit` with empty `fieldErrors` and every typed value preserved. On `action=confirm`, defensively re-run `parseExpenseCreate`, `parseTagCsv`, and (when applicable) `parseNewCategoryName`, re-resolve existing tags / category, and call `updateManyAndExpense` with the combined existing + new sets and the expense id. On success `redirectWithMessage` to `/expenses` with "Expense updated."; on failure or DB collision `redirectWithFormErrors` to `/expenses/:id/edit` with the appropriate field error and every typed value preserved.
**Depends on**: 5, 13

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse `signedInAccess`. Surface a collision message under `category` when a new category was being created, otherwise under `tags` — mirror the Issue 06 create-flow handler's choice.

---

### 15. Build the delete-confirmation page

**Type**: WRITE
**Output**: The edit-route module registers `GET /expenses/:id/delete` (signed-in only). The handler loads the expense via `getExpenseById`; on a missing id `redirectWithError` to `/expenses`. Otherwise it renders a confirmation page with `data-testid="confirm-delete-expense-page"` showing the expense's date, description, formatted amount (`formatCents`), category name, and alphabetized tag list (each labeled and given stable testids `confirm-delete-expense-{date,description,amount,category,tags}`). The page contains a single `<form method="post" action="/expenses/:id/delete">` with a Confirm button (`data-testid="confirm-delete-expense-confirm"`, DaisyUI `btn btn-error`) and a Cancel anchor back to `/expenses/:id/edit` (`data-testid="confirm-delete-expense-cancel"`).
**Depends on**: 1, 11

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match DaisyUI / Tailwind conventions used elsewhere in the routes. Use `formatCents` from `src/lib/money.ts` for the amount.

---

### 16. Wire POST `/expenses/:id/delete`

**Type**: WRITE
**Output**: The edit-route module registers `POST /expenses/:id/delete` (signed-in only). The handler calls `deleteExpense` and on success `redirectWithMessage` to `/expenses` with "Expense deleted."; on failure `redirectWithError` to `/expenses` with a friendly message.
**Depends on**: 7, 15

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse `signedInAccess`. Use `redirectWithMessage` / `redirectWithError` consistently.

---

### 17. Playwright e2e for edit-save (no new items)

**Type**: TEST
**Output**: New spec `e2e-tests/expenses/09-edit-expense.spec.ts` signs in, seeds at least one category, one tag, and one expense, visits `/expenses`, and exercises:

1. Click `expense-row-edit` on the seeded row; assert `/expenses/:id/edit` loads with every form field's `value` matching the seeded expense (description, amount as a plain decimal, date, category name, tags CSV alphabetized).
2. Change the amount to `12.34` and submit; assert redirect to `/expenses`, the success flash is shown, and the row's `expense-row-amount` is now `$12.34` while every other field is unchanged.
3. Reload `/expenses/:id/edit`, change the description and the date, leave category / tags unchanged, submit; assert the row's description and date update on `/expenses`.
**Depends on**: 9, 12, Issue 04 task 6

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`. Follow the structure of `e2e-tests/expenses/02-entry-form.spec.ts`.

---

### 18. Playwright e2e for edit-with-new-tag (consolidated confirmation flow)

**Type**: TEST
**Output**: New spec `e2e-tests/expenses/10-edit-with-new-items.spec.ts` signs in, seeds a category, a tag, and an expense, visits the edit page, and exercises:

1. Append a brand-new tag (e.g. `rent`) to the tags CSV and submit; assert `confirm-edit-new-page` is rendered, lists `Create tag 'rent'` (and no category creation line), and previews the updated expense values. Click `confirm-edit-new-confirm`; assert redirect to `/expenses` and the row's `expense-row-tags` now includes `rent` alphabetized with the existing tag.
2. Visit the edit page again, change the category to a brand-new name and add another brand-new tag; assert the confirmation page lists both `Create category '…'` and `Create tag '…'` lines (alphabetized within each group, category first); click `confirm-edit-new-cancel`; assert redirect back to `/expenses/:id/edit` with every typed field preserved via `value` and no DB changes.
**Depends on**: 12, 13, 14

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`. Follow the structure of `e2e-tests/expenses/05-tags-and-inline-creation.spec.ts`.

---

### 19. Playwright e2e for delete flow

**Type**: TEST
**Output**: New spec `e2e-tests/expenses/11-delete-expense.spec.ts` signs in, seeds an expense with a tag, visits the edit page, clicks `expense-edit-delete`, and exercises:

1. On `confirm-delete-expense-page`, assert every detail is rendered (date, description, formatted amount, category, tags). Click `confirm-delete-expense-cancel`; assert redirect back to `/expenses/:id/edit` and no DB changes.
2. Re-open the delete page and click `confirm-delete-expense-confirm`; assert redirect to `/expenses`, the success flash is shown, and the row is no longer present (assert via `data-testid="expense-row"` count or by description).
**Depends on**: 15, 16

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`.

---

### 20. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `getExpenseById`, `updateExpenseWithTags`, `updateManyAndExpense`, and `deleteExpense` helpers in `expense-access`; the extracted shared `expense-form` renderer; the new `/expenses/:id/edit`, `/expenses/:id/confirm-edit-new`, and `/expenses/:id/delete` routes; the generalized consolidated confirmation page (create vs edit modes); the row-level Edit button. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 19

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link to the Issue 05 inline-category and Issue 06 tags pages. Append a single `## [YYYY-MM-DD] ingest | Issue 08: edit and delete expense` entry to `log.md`.

---

### 21. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/08-edit-delete-expense/code-walkthrough/` covering the new DB helpers, the shared form renderer, the edit route module (GET + POST + confirm-edit-new + delete GET + delete POST), and the generalized confirmation renderer.
**Depends on**: 20

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 22. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A walkthrough under `Notes/walkthroughs/08-edit-delete-expense/ui-walkthrough/` that shows the behavior demonstrated in a browser of this tasks' functionality. use showboat as appropriate to generate the markdown file, and use rodney to take screenshots showing: the row-level Edit button; the pre-populated edit page; an edit-save flow ending on the updated list; an edit flow that introduces a new tag and routes through the consolidated confirmation page; the delete-confirmation page and the resulting list with the row removed.
**Depends on**: 21

Run `uvx showboat --help` and `uvx rodney --help` first to confirm current flags, then generate into the new directory.

---

### 23. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 22

---
