# Tasks for #10: Tags management page

Parent issue: `Notes/issues/10-tags-management-page.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Enforce case-insensitive tag uniqueness in the schema

**Type**: MIGRATE
**Output**: `src/db/schema.ts` defines the `tag.name` uniqueness rule in a way that enforces lowercase-normalized, case-insensitive uniqueness at the database layer, and the generated schema update artifacts reflect that constraint without weakening the existing `expenseTag` and `recurringTag` join-table relationships.
**Depends on**: none

Update the `tag` table definition to mirror the case-insensitive uniqueness pattern applied to `category` in Issue 09. Use the current `category` and `tag` table definitions in `src/db/schema.ts` as references for style. Preserve cascade/restrict behavior on `expenseTag` and `recurringTag` exactly as it exists today; this task only tightens the `tag.name` uniqueness constraint. If the project’s schema-generation script produces migration SQL or schema snapshots, generate only the focused update for this constraint.

---

### 2. Add tag management validators

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` exports tag-management parsing helpers for create, rename, merge confirm, and delete form payloads. The tag name validator trims, requires a non-empty value, enforces the same length convention used for category names (with a testing value at least two characters above the production limit), normalizes to lowercase, and returns field-level errors compatible with the existing form-state flow.
**Depends on**: none

Read and follow the skills under `Notes/skills/code-writing`. Follow the existing `parseExpenseCreate`, `parseNewCategoryName`, `parseTagCsv`, and the Issue 09 category-management validators as references. Keep validators HTTP-agnostic and reusable by both create and rename handlers. Preserve the project convention for production/test max-length constants and use `value`-based form refill behavior downstream. Reuse shared name-shape helpers introduced for categories where it makes sense rather than duplicating logic.

---

### 3. Test tag management validators

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` covers the new tag-management validators: empty names fail, over-limit names fail, valid names are trimmed and lowercased, mixed-case duplicate targets can be represented as normalized names, and malformed merge/delete payloads fail with friendly errors.
**Depends on**: 2

Read and follow the skills under `Notes/skills/code-writing`. Reuse the existing validator test structure in `tests/expense-validators.spec.ts`; do not introduce a new test harness. Mirror the structure of the Issue 09 category-management validator tests. Assert normalized outputs, not implementation details.

---

### 4. Add tag repository helpers

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `createTag`, `renameTag`, `mergeTag`, and `deleteTag` helpers in addition to the existing `listTags`. The helpers normalize names to lowercase, detect case-insensitive duplicates, count expenses referencing a tag via `expenseTag`, merge by atomically repointing every `expenseTag.tagId` from source to target (deduplicating any rows that would collide on the `(expenseId, tagId)` unique key) and deleting the source tag, and block deletes when any expense references the tag with an error that includes the reference count.
**Depends on**: 1, 2

Read and follow the skills under `Notes/skills/code-writing`. Match the existing `expense-access` style: exported function wrapped in `withRetry`, private `Actual` helper, `Result` return values, Drizzle queries, and HTTP-agnostic error messages. Use the Issue 09 `createCategory`/`renameCategory`/`mergeCategory`/`deleteCategory` helpers as the closest reference. Reuse existing `tag`, `expense`, `expenseTag`, and `recurringTag` schema imports. If D1 batch is the project’s atomic primitive, use the same pattern already used by `createManyAndExpense`, `updateManyAndExpense`, and the category merge helper. Be explicit about whether `recurringTag` rows participate in merge repointing and delete blocking; the issue scopes the user-facing reference count to expenses, but referential integrity for `recurringTag` must be preserved.

---

### 5. Unit test tag repository helpers

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `createTag`, `renameTag`, `mergeTag`, and `deleteTag`: create stores lowercase names and rejects case-insensitive duplicates; simple rename updates the tag name and timestamp; rename collision can be detected before merge; merge repoints all `expenseTag` rows from source to target (including the dedupe case where an expense already has both source and target) and removes the source tag; delete fails with the exact referencing expense count when referenced; delete succeeds for an unreferenced tag.
**Depends on**: 4

Read and follow the skills under `Notes/skills/code-writing`. Reuse the current `tests/expense-access.spec.ts` database harness and seeding patterns. Mirror the Issue 09 category repository tests in shape. Assert final database state after merge/delete, including that unrelated tags, expenses, and `expenseTag` rows are unchanged, and that no duplicate `(expenseId, tagId)` rows exist after a merge.

---

### 6. Render the tags management page

**Type**: WRITE
**Output**: `src/routes/build-tags.tsx` renders `/tags` as a signed-in management page with an alphabetical tag list, a single-field create form, per-row rename and delete controls, stable `data-testid` attributes, DaisyUI/Tailwind styling, and preserved form values/errors after validation failures.
**Depends on**: 2, 4

Read and follow the skills under `Notes/skills/code-writing`. Replace the current placeholder renderer in `src/routes/build-tags.tsx`. Follow the route, layout, secure-header, `signedInAccess`, `createDbClient`, `redirectWithError`, `redirectWithMessage`, `redirectWithFormErrors`, and form-state patterns from `src/routes/build-categories.tsx` (Issue 09) and the expense routes. Use real HTML forms and anchors so the page works without JavaScript. Use the `value` attribute for create and rename inputs, not `defaultValue`. Keep the markup, testids, and naming closely parallel to the categories page so screen readers and tests behave consistently across the two pages.

---

### 7. Wire tag create and simple rename POST handlers

**Type**: WRITE
**Output**: `src/routes/build-tags.tsx` handles tag creation and non-colliding renames. `POST /tags` creates a lowercase-normalized tag or returns a field-level uniqueness error. `POST /tags/:id/rename` performs a simple rename when the normalized target does not already exist, redirects back to `/tags`, and surfaces friendly errors for missing tags, validation failures, and duplicate names.
**Depends on**: 6

Read and follow the skills under `Notes/skills/code-writing`. Keep handler behavior consistent with the Issue 09 category create/rename handlers and the expense create/edit handlers: parse body, validate with the new tag validators, use repository helpers only after validation succeeds, redirect instead of returning inline validation HTML, and preserve user-entered values through form-state cookies where appropriate. Make route paths local constants if they are not added to `PATHS`.

---

### 8. Wire rename collision merge confirmation flow

**Type**: WRITE
**Output**: `src/routes/build-tags.tsx` renders a merge-confirmation page when a rename target already exists case-insensitively. The page shows source tag, target tag, and `All N expenses will be reassigned`, with confirm and cancel controls. Confirm runs the atomic merge helper and redirects to `/tags`; cancel redirects back without mutating data.
**Depends on**: 7

Read and follow the skills under `Notes/skills/code-writing`. Follow the merge-confirmation pattern established by Issue 09 in `src/routes/build-categories.tsx` and the confirmation-page patterns from `src/routes/expenses/expense-form.tsx` and `src/routes/expenses/build-edit-expense.tsx`. Keep tag confirmation code in the tag route unless extraction is clearly useful (e.g., only if a shared helper already grew out of the categories work). Defensively re-validate hidden form values on confirm, reload source/target rows from the database, and handle stale or missing tags with a friendly redirect error. The "N expenses" count must reflect distinct expenses referencing the source tag via `expenseTag`, not raw `expenseTag` row counts.

---

### 9. Wire tag delete POST handler

**Type**: WRITE
**Output**: `src/routes/build-tags.tsx` handles tag deletion from the management page. Deleting a tag referenced by any expense is blocked and redirects back with an error message stating how many expenses reference it. Deleting an unreferenced tag removes it and redirects back with a success message.
**Depends on**: 6

Read and follow the skills under `Notes/skills/code-writing`. Use the repository `deleteTag` helper rather than duplicating join-table logic in the route. Surface the user-facing reference count from the helper. Use a real POST form for delete and include stable `data-testid` attributes following the project’s `name-action` convention, parallel to the categories delete control.

---

### 10. Playwright e2e for tag create and duplicate validation

**Type**: TEST
**Output**: A new tag management Playwright spec under `e2e-tests/expenses/` signs in, visits `/tags`, creates `Travel`, verifies the list shows `travel` in alphabetical order, then attempts to create `TRAVEL` and verifies a uniqueness error is shown without creating a duplicate row.
**Depends on**: 7

Read and follow the skills under `Notes/skills/code-writing`. Use the sign-in and database helpers from `e2e-tests/support/`. Follow the structure of the existing expense specs and the Issue 09 category management specs. Run tests with `npx playwright test -x` and target this spec while developing.

---

### 11. Playwright e2e for tag rename and merge

**Type**: TEST
**Output**: A new tag management Playwright spec under `e2e-tests/expenses/` covers simple rename and rename-with-merge: renaming `travel` to `trips` stores lowercase `trips`; renaming one tag to an existing tag renders the merge confirmation page; confirming repoints all source `expenseTag` rows to the target tag (deduplicating where the target was already attached), deletes the source tag, and redirects back to `/tags`.
**Depends on**: 8

Read and follow the skills under `Notes/skills/code-writing`. Seed at least two tags and several expenses (including one expense already attached to both source and target tags so the dedupe path is exercised) through the existing support helpers. Assert both UI behavior and resulting expense/tag/`expenseTag` state through page-visible rows or support helper queries, matching the approach used by existing expense edit/delete and category management specs.

---

### 12. Playwright e2e for tag delete blocked and delete success

**Type**: TEST
**Output**: A new tag management Playwright spec under `e2e-tests/expenses/` covers delete-blocked and delete-success: deleting a tag referenced by N expenses shows an error containing N and leaves the tag in the list; deleting an unreferenced tag redirects back and removes it from the list.
**Depends on**: 9

Read and follow the skills under `Notes/skills/code-writing`. Use the support helpers from `e2e-tests/support/` and stable `data-testid` selectors from the route implementation. Keep this spec focused on delete behavior; do not duplicate create/rename coverage from tasks 10 and 11.

---

### 13. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` document the Issue 10 tags management page, the new tag validators, tag repository helpers, merge-on-rename flow, delete-reference-count behavior, and route/test coverage. `Notes/wiki/index.md` and `Notes/wiki/log.md` are updated according to the wiki rules.
**Depends on**: 10, 11, 12

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link the Issue 09 category management wiki pages where the behavior is parallel, and explicitly call out tag-specific differences (join-table-based reference counting, dedupe on merge, recurringTag handling). Append a single dated ingest entry for Issue 10.

---

### 14. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/10-tags-management-page/code-walkthrough` containing showboat-generated files that explain the tag management implementation.
**Depends on**: 13

Use showboat to create a code walkthrough of the implementation. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Include the schema/validator/repository/route/test files touched by Issue 10.

---

### 15. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A new walkthrough directory exists at `Notes/walkthroughs/10-tags-management-page/ui-walkthrough` containing showboat-generated files that demonstrate the user-facing flows added by Issue 10: create, rename (simple), rename-with-merge confirmation, delete-blocked error, and delete-success.
**Depends on**: 14

Use showboat to create a UI walkthrough of `/tags`. Run `uvx showboat --help` first if needed, then generate the walkthrough into the specified directory. Cover all user-visible paths exercised by the e2e specs, including the merge confirmation page and the delete-blocked error state with the reference count.

---

### 16. Human review

**Type**: REVIEW
**Output**: A human has reviewed the completed Issue 10 implementation, verified the manual checklist from `Notes/issues/10-tags-management-page.md`, and confirmed the merge/delete semantics are acceptable before proceeding to the next issue.
**Depends on**: 15

Review the final diff, run the focused and full relevant test suites, and manually verify `/tags` using the issue’s checklist. Pay particular attention to data-loss risks in the merge flow (especially the `expenseTag` dedupe path), to whether case-insensitive uniqueness is truly enforced at both validator and database layers, and to whether `recurringTag` references are handled consistently with the issue’s scope.

---
