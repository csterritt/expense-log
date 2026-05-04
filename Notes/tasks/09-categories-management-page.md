# Tasks for #09: Categories management page

Parent issue: `Notes/issues/09-categories-management-page.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Enforce case-insensitive category uniqueness in the schema

**Type**: MIGRATE
**Output**: `src/db/schema.ts` defines the category name uniqueness rule in a way that enforces lowercase-normalized, case-insensitive uniqueness at the database layer, and the generated schema update artifacts reflect that constraint without weakening existing category foreign-key relationships.
**Depends on**: none

Update the `category` table definition to use the existing Drizzle schema patterns while preserving `expense.categoryId` and `recurring.categoryId` `onDelete: 'restrict'` behavior. Use the current `tag` and `expense` table definitions as references for style, but apply the stricter category uniqueness requirement from the PRD. If the project’s schema-generation script produces migration SQL or schema snapshots, generate only the required update and keep it focused on the category uniqueness constraint.

---

### 2. Add category management validators

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` exports category-management parsing helpers for create, rename, merge confirm, and delete form payloads. The category name validator trims, requires a non-empty value, enforces the Issue 09 name length convention with a testing value at least two characters above the production limit, normalizes to lowercase, and returns field-level errors compatible with the existing form-state flow.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Follow the existing `parseExpenseCreate`, `parseNewCategoryName`, and `parseTagCsv` patterns in `src/lib/expense-validators.ts`. Keep validators HTTP-agnostic and reusable by both create and rename handlers. Preserve the project convention for production/test max-length constants and use `value`-based form refill behavior downstream.

---

### 3. Test category management validators

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` covers the new category-management validators: empty names fail, over-limit names fail, valid names are trimmed and lowercased, mixed-case duplicate targets can be represented as normalized names, and malformed merge/delete payloads fail with friendly errors.
**Depends on**: 2

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse the existing validator test structure in `tests/expense-validators.spec.ts`; do not introduce a new test harness. Assert normalized outputs, not implementation details.

---

### 4. Add category repository helpers

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `createCategory`, `renameCategory`, `mergeCategory`, and `deleteCategory` helpers in addition to the existing `listCategories`. The helpers normalize names to lowercase, detect case-insensitive duplicates, count referencing expenses where needed, merge by atomically repointing every `expense.categoryId` from source to target and deleting the source, and block deletes when expenses reference the category with an error that includes the reference count.
**Depends on**: 1, 2

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the existing `expense-access` style: exported function wrapped in `withRetry`, private `Actual` helper, `Result` return values, Drizzle queries, and HTTP-agnostic error messages. Reuse existing `category`, `expense`, and `recurring` schema imports; ensure merge/delete behavior preserves referential integrity and avoids partial writes. If D1 batch is the project’s atomic primitive, use the same pattern already used by `createManyAndExpense` and `updateManyAndExpense`.

---

### 5. Unit test category repository helpers

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `createCategory`, `renameCategory`, `mergeCategory`, and `deleteCategory`: create stores lowercase names and rejects case-insensitive duplicates; simple rename updates the category name and timestamp; rename collision can be detected before merge; merge repoints all source expenses to the target and removes the source; delete fails with the exact referencing expense count when referenced; delete succeeds for an unreferenced category.
**Depends on**: 4

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse the current `tests/expense-access.spec.ts` database harness and seeding patterns. Assert final database state after merge/delete, including that unrelated categories and expenses are unchanged.

---

### 6. Render the categories management page

**Type**: WRITE
**Output**: `src/routes/build-categories.tsx` renders `/categories` as a signed-in management page with an alphabetical category list, a single-field create form, per-row rename and delete controls, stable `data-testid` attributes, DaisyUI/Tailwind styling, and preserved form values/errors after validation failures.
**Depends on**: 2, 4

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Replace the current placeholder renderer in `src/routes/build-categories.tsx`. Follow the route, layout, secure-header, `signedInAccess`, `createDbClient`, `redirectWithError`, `redirectWithMessage`, `redirectWithFormErrors`, and form-state patterns from `src/routes/expenses/build-expenses.tsx` and `src/routes/expenses/build-edit-expense.tsx`. Use real HTML forms and anchors so the page works without JavaScript. Use the `value` attribute for create and rename inputs, not `defaultValue`.

---

### 7. Wire category create and simple rename POST handlers

**Type**: WRITE
**Output**: `src/routes/build-categories.tsx` handles category creation and non-colliding renames. `POST /categories` creates a lowercase-normalized category or returns a field-level uniqueness error. `POST /categories/:id/rename` performs a simple rename when the normalized target does not already exist, redirects back to `/categories`, and surfaces friendly errors for missing categories, validation failures, and duplicate names.
**Depends on**: 6

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Keep handler behavior consistent with the expense create/edit handlers: parse body, validate with the new category validators, use repository helpers only after validation succeeds, redirect instead of returning inline validation HTML, and preserve user-entered values through form-state cookies where appropriate. Make route paths local constants if they are not added to `PATHS`.

---

### 8. Wire rename collision merge confirmation flow

**Type**: WRITE
**Output**: `src/routes/build-categories.tsx` renders a merge-confirmation page when a rename target already exists case-insensitively. The page shows source category, target category, and `All N expenses will be reassigned`, with confirm and cancel controls. Confirm runs the atomic merge helper and redirects to `/categories`; cancel redirects back without mutating data.
**Depends on**: 7

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Follow the confirmation-page patterns from `src/routes/expenses/expense-form.tsx` and `src/routes/expenses/build-edit-expense.tsx`, but keep category confirmation code in the category route unless extraction is clearly useful. Defensively re-validate hidden form values on confirm, reload source/target rows from the database, and handle stale or missing categories with a friendly redirect error.

---

### 9. Wire category delete POST handler

**Type**: WRITE
**Output**: `src/routes/build-categories.tsx` handles category deletion from the management page. Deleting a referenced category is blocked and redirects back with an error message stating how many expenses reference it. Deleting an unreferenced category removes it and redirects back with a success message.
**Depends on**: 6

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the repository `deleteCategory` helper rather than duplicating foreign-key logic in the route. Preserve the existing FK `RESTRICT` behavior as a backstop, but surface the user-facing reference count from the helper. Use a real POST form for delete and include stable `data-testid` attributes following the project’s `name-action` convention.

---

### 10. Playwright e2e for category create and duplicate validation

**Type**: TEST
**Output**: A new category management Playwright spec under `e2e-tests/expenses/` signs in, visits `/categories`, creates `Food`, verifies the list shows `food` in alphabetical order, then attempts to create `FOOD` and verifies a uniqueness error is shown without creating a duplicate row.
**Depends on**: 7

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in and database helpers from `e2e-tests/support/`. Follow the structure of the existing expense specs, especially the validation and inline category creation flows. Run tests with `npx playwright test -x` and target this spec while developing.

---

### 11. Playwright e2e for category rename and merge

**Type**: TEST
**Output**: A new category management Playwright spec under `e2e-tests/expenses/` covers simple rename and rename-with-merge: renaming `food` to `groceries` stores lowercase `groceries`; renaming one category to an existing category renders the merge confirmation page; confirming repoints all source expenses to the target category, deletes the source category, and redirects back to `/categories`.
**Depends on**: 8

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Seed at least two categories and expenses through the existing support helpers. Assert both UI behavior and resulting expense/category state through page-visible rows or support helper queries, matching the approach used by existing expense edit/delete specs.

---

### 12. Playwright e2e for category delete blocked and delete success

**Type**: TEST
**Output**: A new category management Playwright spec under `e2e-tests/expenses/` covers delete-blocked and delete-success: deleting a category referenced by N expenses shows an error containing N and leaves the category in the list; deleting an unreferenced category redirects back and removes it from the list.
**Depends on**: 9

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the support helpers from `e2e-tests/support/` and stable `data-testid` selectors from the route implementation. Keep this spec focused on delete behavior; do not duplicate create/rename coverage from tasks 10 and 11.

---

### 13. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` document the Issue 09 category management page, the new category validators, category repository helpers, merge-on-rename flow, delete-reference-count behavior, and route/test coverage. `Notes/wiki/index.md` and `Notes/wiki/log.md` are updated according to the wiki rules.
**Depends on**: 10, 11, 12

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link existing expense/category-related wiki pages where relevant. Append a single dated ingest entry for Issue 09.

---

### 14. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/09-categories-management-page/code-walkthrough` containing showboat-generated files that explain the category management implementation.
**Depends on**: 13

Use showboat to create a code walkthrough of the implementation. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Include the schema/validator/repository/route/test files touched by Issue 09.

---

### 15. Human review

**Type**: REVIEW
**Output**: A human has reviewed the completed Issue 09 implementation, verified the manual checklist from `Notes/issues/09-categories-management-page.md`, and confirmed the merge/delete semantics are acceptable before proceeding to the next issue.
**Depends on**: 14

Review the final diff, run the focused and full relevant test suites, and manually verify `/categories` using the issue’s checklist. Pay particular attention to data-loss risks in merge/delete flows and to whether case-insensitive uniqueness is truly enforced at both validator and database layers.

---
