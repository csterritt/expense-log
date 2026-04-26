# Tasks for #06: Tags on expenses (no-JS CSV path) + inline tag creation

Parent issue: `Notes/issues/06-tags-no-js-inline-creation.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add `findTagsByNames` to `expense-access`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `findTagsByNames(db, names: string[]): Promise<Result<TagRow[], Error>>` that performs a single case-insensitive lookup (compare via `lower(tag.name) IN (...)`) and returns every matching `{ id, name }` row. Empty / whitespace-only entries in `names` are ignored; the `names` input is trimmed and lower-cased before querying; duplicates in the input are collapsed so the SQL has a unique `IN` list. An empty effective list must short-circuit to `Result.ok([])` without issuing a query. Wrap with `withRetry` consistent with the other helpers in this file.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the drizzle import style and `Result` wrapping pattern already used by `listCategories`, `findCategoryByName`, and `createExpense` in the same file. Keep the helper HTTP-agnostic — callers (the POST handlers) are responsible for diffing the requested names against the returned rows to determine which tags must be created.

---

### 2. Add `createManyAndExpense` atomic helper

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `createManyAndExpense(db, input: { newCategoryName: string | null; existingCategoryId: string | null; newTagNames: string[]; existingTagIds: string[]; date: string; description: string; amountCents: number }): Promise<Result<{ categoryId: string; expenseId: string; createdTagIds: string[] }, Error>>` that runs a single drizzle transaction which: optionally inserts a new `category` row (lower-cased after trim) when `newCategoryName` is non-null and uses its id; otherwise uses `existingCategoryId`; inserts a new `tag` row (lower-cased, trimmed) for each entry in `newTagNames`; inserts the `expense` row referencing the resolved category id; and inserts one `expenseTag` row per tag id (existing ids first, then newly-created ids), de-duplicated so any given tag is linked at most once. Returns the resolved `categoryId`, the new `expenseId`, and the list of newly-created tag ids. Exactly one of `newCategoryName` / `existingCategoryId` must be supplied; the helper must return `Result.err` with a clear message if both or neither are provided. On any unique-index collision (race on category name or tag name) the transaction must rollback and the function must return `Result.err` with a friendly message so callers can redirect to the entry form with a field-level error.
**Depends on**: 1, Issue 05 task 2

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Build on top of the `createCategoryAndExpense` pattern introduced in Issue 05 task 2: reuse the same `db.transaction(...)` shape, id-generation approach, and `withRetry` outer wrapper. Do not pre-check for collisions inside the transaction — rely on the unique indexes on `category.name` and `tag.name`. Keep the helper HTTP-agnostic.

---

### 3. Unit tests for the new DB helpers

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers: `findTagsByNames` returns rows for a mixed case-insensitive input, returns an empty array when none match, silently drops empty / whitespace entries, and short-circuits on a fully-empty list (no query issued); `createManyAndExpense` inserts the expense plus every `expenseTag` link for the combined existing + new tag sets (no duplicate links even when an existing id is repeated), rolls back cleanly when a new tag name collides with a pre-seeded lower-cased tag (asserting neither the expense nor any tag row was created), and rejects invalid inputs where both or neither of `newCategoryName` / `existingCategoryId` are supplied.
**Depends on**: 2

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the same test-DB harness used for the Issue 05 helper tests. Match the assertion style of `tests/expense-validators.spec.ts` and `tests/money.spec.ts`. If the Issue 05 harness deferred DB assertions to e2e, mirror that decision here and document it in the file header — do not invent a new harness.

---

### 4. Extend `expense-validators` with tag-CSV parsing

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` gains a `parseTagCsv(input: string): Result<string[], string>` helper that splits the raw CSV on `,`, trims every entry, drops empty-after-trim entries, lower-cases the survivors, de-duplicates silently (preserving first-appearance order), and enforces `length <= tagNameMax` on every kept name. Export `tagNameMax` from the validators module using the `PRODUCTION:UNCOMMENT` pattern (production value 20, testing value at least 22). If any kept name exceeds `tagNameMax`, return `Result.err` with a message that will surface as a `tags` field error; the success branch returns the normalized list (possibly empty). Add a `tags` entry to the `FieldErrors` semantics so the entry form renders the error inline.
**Depends on**: Issue 04 task 1, Issue 05 task 4

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the valibot usage and `safeParse`-driven extraction style already in `src/lib/validators.ts` and `src/lib/expense-validators.ts`. Keep `tagNameMax` local to this module so the entry form's `<input maxlength>` and the validator stay in sync (the form will compute its `maxlength` from `tagNameMax * some-small-multiplier` plus commas — that sizing happens in task 6).

---

### 5. Unit tests for tag-CSV validation

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` adds cases for `parseTagCsv`: empty string returns `ok([])`; `"food, groceries"` returns `ok(['food','groceries'])`; case-insensitive de-duplication collapses `"Food, food, FOOD"` to `['food']`; surrounding whitespace per entry is trimmed; a single name of `tagNameMax + 1` chars returns `err`; a valid list that also contains a too-long name returns `err`; an all-empty CSV like `", ,  ,"` returns `ok([])`.
**Depends on**: 4

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the existing assertion style — assert presence of an error string per failing case, not exact wording.

---

### 6. Add a tags CSV input to the entry form

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` gains a `<input type="text" name="tags">` placed below the category input, with `data-testid="expense-form-tags"`, `value={formValues.tags ?? ''}` for sticky preservation across error redirects, a `maxlength` sized generously for a CSV (at least `(tagNameMax + 2) * 8` from task 4's constant — no hard-coded magic number) and a short helper label like "Tags (comma-separated)". Render the `tags` field error block introduced in task 4 immediately below the input, reusing the same field-error rendering pattern established by Issue 04 task 3. Do not introduce client-side JS — the chip picker lands in Issue 7.
**Depends on**: 4, Issue 04 task 3

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the `value` attribute (not `defaultValue`). Keep the form submit-only.

---

### 7. Render tags on the expense list rows

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` (or whichever renderer produces the `/expenses` list — pick the same module Issue 02 settled on) extends each row to show the expense's tags as a comma-separated, alphabetical list, with `data-testid="expense-row-tags"` on the containing span. When an expense has no tags, render an empty span (still with the testid) so selector-based tests remain stable. The list query is extended to left-join `expenseTag` and `tag` and aggregate tag names per expense; add a small helper in `src/lib/db/expense-access.ts` named `listExpensesWithTags(db)` that returns `Array<ExpenseRow & { tags: string[] }>` sorted by the list's existing order (tag names alphabetized inside each row). Update the list's type and the row renderer to consume the new shape.
**Depends on**: Issue 02 task's list renderer

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the drizzle query style already used by `listExpenses` / equivalent in `src/lib/db/expense-access.ts`. Keep DaisyUI / Tailwind styling consistent with the rest of the row.

---

### 8. Extend the consolidated confirmation page for categories + tags

**Type**: WRITE
**Output**: The confirmation renderer from Issue 05 task 7 is generalized to a "Confirm new items" page that lists **every** new name the submission would create: zero or one `Create category 'foo'` line plus zero-or-more `Create tag 'bar'` lines (lower-cased, alphabetized within each group, categories listed first). The expense preview (description, formatted amount via `formatCents`, date, final category name, final tag list) is unchanged in spirit but must include the normalized tag list. The form's hidden inputs must carry `description`, `amount` (raw typed string), `date`, `category`, and `tags` (the raw user-typed CSV — **not** the normalized list — so Cancel restores exactly what the user typed). The POST action becomes `/expenses/confirm-create-new` (rename from `/expenses/confirm-create-category`); update the two-button pattern so `name="action"` with values `confirm` / `cancel` remains the only distinguisher. Add / rename `data-testid`s to `confirm-create-new-page`, `confirm-create-new-confirm`, and `confirm-create-new-cancel` following the project's `name-action` convention. If Issue 05's testids are referenced from its e2e spec, update that spec's selectors in the same task (one rename, one commit).
**Depends on**: 4, Issue 05 tasks 7 and 8

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the DaisyUI/Tailwind conventions used in `src/routes/build-layout.tsx`. No client-side JS — submit-only. Format the previewed amount with `formatCents` from `src/lib/money.ts`.

---

### 9. Wire POST handlers for the combined confirmation flow

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` POST handler is updated so that after `parseExpenseCreate` and `parseTagCsv` both succeed: resolve the category via `findCategoryByName` (Issue 05 task 1) and the tags via `findTagsByNames` (task 1), compute the "new category?" and "new tag names" diff. If nothing is new, call the existing-path `createExpense` helper with the resolved category id and attach the existing tag ids (add a small `createExpenseWithTags` helper in `expense-access.ts` or extend `createExpense` — pick whichever keeps the call site small). If anything is new, validate the new-category name via `parseNewCategoryName` (Issue 05 task 4) when applicable; on any length/empty error redirect back to `/expenses` via `redirectWithFormErrors` preserving every typed field (including the raw `tags` CSV). Otherwise render the generalized confirmation page from task 8 seeded with the raw typed values, the normalized new-category name (or null), and the normalized new-tag list.

The `/expenses/confirm-create-new` POST route reads `action`, `description`, `amount`, `date`, `category`, and `tags` from the body. On `action=confirm`, re-run `parseExpenseCreate`, `parseTagCsv`, and (if needed) `parseNewCategoryName` defensively, re-resolve existing tags/category, and call `createManyAndExpense` (task 2) with the combined existing + new sets; on success `redirectWithMessage` to `/expenses`; on failure or DB collision `redirectWithFormErrors` with the appropriate field error and every typed value preserved (including the raw CSV). On `action=cancel`, `redirectWithFormErrors` to `/expenses` with an empty `fieldErrors` map and every typed value preserved so Cancel restores the form exactly — including the raw tag CSV.
**Depends on**: 1, 2, 4, 8, Issue 05 tasks 1, 4, and 8

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse `signedInAccess` for both routes. Never return inline HTML for validation failures — always go through the redirect-with-payload helper. Remove the old `/expenses/confirm-create-category` route registration as part of the rename from task 8. Keep handlers small; extract a private helper that computes the "new items" diff if it improves readability.

---

### 10. Playwright e2e for the tags + combined-creation flow

**Type**: TEST
**Output**: A new spec under `e2e-tests/expenses/` (e.g. `05-tags-and-inline-creation.spec.ts`) that signs in, seeds at least one existing category and at least one existing tag (`groceries`), visits `/expenses`, and exercises:

1. Submit an expense with an existing category and `tags=food, groceries, food` (where `food` does not exist). Assert the `confirm-create-new-page` is shown, lists `Create tag 'food'` (and no category creation line), and previews the expense. Click `confirm-create-new-confirm`; assert the new row on `/expenses` shows tags `food, groceries` (alphabetical, duplicate silently dropped) via `expense-row-tags`.
2. Submit with a brand-new category `Groceries` **and** brand-new tags `Rent, Utilities`. Assert the confirmation page lists `Create category 'groceries'`, `Create tag 'rent'`, `Create tag 'utilities'` (alphabetical within the tag group, category first), then confirm and assert the list row has category `groceries` and tags `rent, utilities`. Resubmit with category `GROCERIES` and tags `Rent` (any case); assert the existing-match branch runs (no confirmation page) and the row is created directly.
3. Submit, reach the confirmation page, click `confirm-create-new-cancel`; assert redirect to `/expenses`, the entry form shows every typed field preserved via `value` — description, amount, date, category input, and the **raw typed** tag CSV (including any duplicates and original casing) — and no new rows were created.
4. Submit with a tag whose name is `tagNameMax + 1` chars (use the testing value). Assert `expense-form-tags-error` is visible on the entry form, no confirmation page is rendered, and every other typed field is preserved.
5. Submit with `tags=" , ,   "` plus valid category/description/amount/date. Assert the expense is created with no tags attached and the row's `expense-row-tags` is empty.

After each error case, fix only the failing field and resubmit; assert the success path completes.
**Depends on**: 3, 5, 9, Issue 04 task 6, Issue 05 task 9

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`. Select elements via the `data-testid`s introduced in tasks 6, 7, and 8. Follow the structure of `e2e-tests/expenses/03-validation-errors.spec.ts` and the Issue 05 inline-category e2e.

---

### 11. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `findTagsByNames`, `createManyAndExpense`, and `listExpensesWithTags` helpers in `expense-access`; the `parseTagCsv` extension and `tagNameMax` constant in `expense-validators`; the new tags CSV input on the entry form; the tags column on list rows; the generalized "Confirm new items" page and its renamed `/expenses/confirm-create-new` POST route with confirm/cancel branches. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 10

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link to the Issue 05 inline-category pages and the Issue 04 validators / redirect-payload pages. Append a single `## [YYYY-MM-DD] ingest | Issue 06: tags (no-JS CSV) + inline tag creation` entry to `log.md`.

---

### 12. Walkthrough

**Type**: WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/06-tags-no-js-inline-creation/` covering the new DB helpers, the `parseTagCsv` validator, the tags CSV input, the list-row tag rendering, the generalized confirmation page, and the combined confirm/cancel POST handlers.
**Depends on**: 11

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 13. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 12

---
