# Tasks for #13: Recurring templates CRUD (no cron yet)

Parent issue: `Notes/issues/13-recurring-crud.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add `recurrence.nextOccurrenceAfter` monthly-only stub

**Type**: WRITE
**Output**: A new pure module `src/lib/recurrence.ts` exports `nextOccurrenceAfter({ recurrence, anchorDate, after }: { recurrence: 'Monthly' | 'Quarterly' | 'Yearly'; anchorDate: string; after: string }): string` that, for `'Monthly'`, returns the next `YYYY-MM-DD` strictly after `after` whose day-of-month equals the anchor day, applying the 28th-shift rule (anchor day 29/30/31 in a short month becomes 28). For `'Quarterly'` and `'Yearly'` it throws an `Error('Not yet implemented — see Issue 14')` so callers can surface a clear message until Issue 14 lands. Inputs are validated to be `YYYY-MM-DD`; invalid inputs throw a plain `Error` with a helpful message.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Keep this module HTTP-agnostic and date-library-free (use `et-date` helpers in `src/lib/et-date.ts` if useful for ET-anchored math, otherwise plain `Date` arithmetic on the calendar fields). Do not import drizzle, Hono, or anything from `src/lib/db/`.

---

### 2. Unit tests for `nextOccurrenceAfter` (monthly only)

**Type**: TEST
**Output**: New spec `tests/recurrence.spec.ts` covers monthly anchors 1, 15, 28, 29, 30, 31 across a non-leap February (anchor 29/30/31 → Feb 28), across April (anchor 31 → Apr 30), and same-day-as-`after` returning the *next* month (strictly-after semantics). Asserts `'Quarterly'` and `'Yearly'` throw the documented "see Issue 14" error. Asserts malformed `anchorDate` / `after` throw.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use vitest in the same style as the existing `tests/*.spec.ts` files. Pure unit tests — no DB harness needed.

---

### 3. Add `listRecurring` to `expense-access`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `listRecurring(db): Promise<Result<Array<RecurringRow & { categoryName: string; tagIds: string[]; tagNames: string[] }>, Error>>`, sorted by `description` ascending (case-insensitive collation matching the `category`/`tag` lower-name uniqueness convention). Joins `recurring` ⨝ `category` ⨝ `recurringTag` ⨝ `tag`; aggregates `tagIds` and `tagNames` per row alphabetized. Wrap with `withRetry`.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match the drizzle import style and `Result` wrapping pattern used by `listExpenses` in the same file. Keep the helper HTTP-agnostic.

---

### 4. Unit test for `listRecurring`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` adds coverage for `listRecurring`: returns `[]` when no templates exist; returns templates sorted by description (case-insensitive); resolves `categoryName` and alphabetized `tagNames` / `tagIds`; returns rows with empty `tagNames` / `tagIds` for templates with no tag links.
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness already used by the other `expense-access` helper tests in the same spec.

---

### 5. Add `getRecurringById`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `getRecurringById(db, id: string): Promise<Result<(RecurringRow & { categoryName: string; tagIds: string[]; tagNames: string[] }) | null, Error>>` that returns the full template (including `recurrence`, `anchorDate`, `categoryName`, alphabetized `tagIds`/`tagNames`) or `null` when the row does not exist. Wrap with `withRetry`.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match the shape of `getExpenseById`. Keep the helper HTTP-agnostic.

---

### 6. Unit test for `getRecurringById`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` adds coverage for `getRecurringById`: returns `ok(null)` for an unknown id; returns the full row including resolved category name and alphabetized `tagNames` / `tagIds` for a seeded template with two tags; returns the row with empty tag arrays for a template with no tag links.
**Depends on**: 5

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness used in task 4.

---

### 7. Add `createRecurringWithTags` and `createManyAndRecurring` atomic helpers

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `createRecurringWithTags(db, input: { description: string; amountCents: number; categoryId: string; recurrence: 'Monthly' | 'Quarterly' | 'Yearly'; anchorDate: string; tagIds: string[] }): Promise<Result<{ id: string }, Error>>` and `createManyAndRecurring(db, input: { newCategoryName: string | null; existingCategoryId: string | null; newTagNames: string[]; existingTagIds: string[]; description: string; amountCents: number; recurrence: 'Monthly' | 'Quarterly' | 'Yearly'; anchorDate: string }): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>>`. Both run a single drizzle transaction, mirror the corresponding `createExpenseWithTags` / `createManyAndExpense` helpers (id generation, unique-collision rollback → friendly `Result.err`, exactly one of new/existing category required), but write into `recurring` + `recurringTag` instead of `expense` + `expenseTag`. Wrap with `withRetry`.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the transaction-shape and id-generation patterns of the existing expense helpers. Keep the helpers HTTP-agnostic.

---

### 8. Unit tests for `createRecurringWithTags` and `createManyAndRecurring`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers both helpers: persists `description`, `amountCents`, `categoryId`, `recurrence`, `anchorDate`; links every supplied tag id (de-duplicated); `createManyAndRecurring` inserts a new category when `newCategoryName` is non-null and inserts each `newTagNames` entry then links them alongside `existingTagIds`; rolls back cleanly on a tag-name collision (asserting no `recurring` row, no new tag); rejects invalid input where both or neither of `newCategoryName` / `existingCategoryId` are supplied.
**Depends on**: 7

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness used in tasks 4 / 6.

---

### 9. Add `updateRecurringWithTags` and `updateManyAndRecurring`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `updateRecurringWithTags(db, input: { id: string; description: string; amountCents: number; categoryId: string; recurrence: 'Monthly' | 'Quarterly' | 'Yearly'; anchorDate: string; tagIds: string[] }): Promise<Result<{ id: string }, Error>>` and `updateManyAndRecurring(db, input: { id: string; newCategoryName: string | null; existingCategoryId: string | null; newTagNames: string[]; existingTagIds: string[]; description: string; amountCents: number; recurrence: 'Monthly' | 'Quarterly' | 'Yearly'; anchorDate: string }): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>>`. Both mirror `updateExpenseWithTags` / `updateManyAndExpense`: a single transaction updates the `recurring` row (description, amountCents, categoryId, recurrence, anchorDate, updatedAt), deletes every `recurringTag` row for the id, and inserts the de-duplicated combined existing+new tag ids. Returns `Result.err` on unknown id or unique-index collision. Wrap with `withRetry`.

Critically: editing the template must NOT rewrite any past generated `expense` rows (this is naturally true since we only mutate `recurring` + `recurringTag`; document this invariant in a JSDoc comment on each function).
**Depends on**: 5, 7

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the patterns from the existing `updateExpenseWithTags` / `updateManyAndExpense` helpers. Keep the helpers HTTP-agnostic.

---

### 10. Unit tests for `updateRecurringWithTags` and `updateManyAndRecurring`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers both update helpers: replaces field values and full tag set (idempotent on identical input; de-duplicates duplicate ids); `updateManyAndRecurring` creates new category and tags then links them alongside `existingTagIds`; rolls back cleanly on a tag-name collision; returns `Result.err` for unknown id; **explicitly asserts that any seeded `expense` rows whose `recurringId` matches the template are byte-identical (description, amountCents, date, categoryId, occurrenceDate) before and after the update**.
**Depends on**: 9

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness used in tasks 4 / 6 / 8.

---

### 11. Add `deleteRecurring`

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `deleteRecurring(db, id: string): Promise<Result<void, Error>>` that deletes the `recurring` row by id; the existing `ON DELETE CASCADE` on `recurringTag` cleans up tag links, and the existing `ON DELETE SET NULL` on `expense.recurringId` clears provenance on past generated rows while leaving them visible. Returns `Result.err` with a friendly message when the row does not exist. Wrap with `withRetry`.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match the shape of `deleteExpense`. Keep the helper HTTP-agnostic.

---

### 12. Unit test for `deleteRecurring`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `deleteRecurring`: seeds a template with two tags AND an `expense` row whose `recurringId` points at the template; calls `deleteRecurring`; asserts the `recurring` row is gone, every `recurringTag` link is gone, the seeded `expense` row is **still present** with `recurringId = NULL` and `occurrenceDate` preserved, and the referenced `category` / `tag` rows are intact. Returns `Result.err` for an unknown id.
**Depends on**: 11

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the test-DB harness. Insert the seeded `expense` row directly via drizzle in the test (do not depend on the dev seed route from task 23).

---

### 13. Add recurring-form validators

**Type**: WRITE
**Output**: `src/lib/expense-validators.ts` (or a sibling `recurring-validators.ts` if the file becomes too large — choose based on file size after the addition) exports `parseRecurringCreate(values: RecurringFormValues): Result<ParsedRecurringCreate, FieldErrors>` that runs every rule already enforced by `parseExpenseCreate` for description (≤ 200), amount (> 0, ≤ 2 decimals), and category-name (≤ 20 chars when supplied as new) plus: `recurrence ∈ {'Monthly','Quarterly','Yearly'}` (required, exact match) and `anchorDate` is a valid `YYYY-MM-DD` (rejecting impossible dates like `2025-02-30`). Field-level errors mirror the structure used by `parseExpenseCreate`.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the existing parsing primitives and `FieldErrors` shape. Use the same date-validation approach already used elsewhere (look for existing `YYYY-MM-DD` parsers in `src/lib/`).

---

### 14. Unit tests for the recurring validators

**Type**: TEST
**Output**: `tests/expense-validators.spec.ts` (or matching new spec file) covers `parseRecurringCreate` happy paths for each recurrence value and rejection paths for: description > 200, amount = 0, amount with 3+ decimals, category missing, recurrence missing or not in the allowed set, anchor date malformed, anchor date impossible (`2025-02-30`).
**Depends on**: 13

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match the structure of the existing `parseExpenseCreate` tests in the same file.

---

### 15. Extract shared recurring-form renderer

**Type**: WRITE
**Output**: A new module `src/routes/recurring/recurring-form.tsx` exports `renderRecurringForm({ mode, action, state, payloads, recurringId? })` that produces the JSX form for a recurring template. `mode` is `'create' | 'edit'`. Fields: description, amount, category (reuses the same combobox + JSON payload script blocks as the expense form), tags (reuses the same chip picker), `recurrence` (a `<select>` with `Monthly`/`Quarterly`/`Yearly`), and `anchorDate` (an `<input type="date">`). Submit-button label is `Add recurring` in create / `Save changes` in edit; testids are `recurring-form-create` / `recurring-form-save`; form `data-testid="recurring-form"`. All inputs use `value` (not `defaultValue`) so post-error redirects re-fill.
**Depends on**: 13

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use a real `<form method="post">` — submit-only, no client-side JS in this task. Reuse the existing category-combobox / tag-chip-picker hooks (`data-category-combobox`, `data-tag-chip-picker`) so the shared progressive-enhancement script Just Works.

---

### 16. Replace the `/recurring` placeholder with the real list page

**Type**: WRITE
**Output**: `src/routes/build-recurring.tsx` replaces the placeholder with a real list page (signed-in only): calls `listRecurring`, renders a DaisyUI table with columns Description, Amount (formatted via `formatCents`), Category, Tags (alphabetized, comma-separated), Recurrence (capitalized: `Monthly`/`Quarterly`/`Yearly` already match), Anchor date, Next occurrence (computed via `recurrence.nextOccurrenceAfter` using `todayEt()` as `after`; for `'Quarterly'`/`'Yearly'` catch the documented throw and render the literal text `—` so the page stays alive until Issue 14). Each row has an Edit anchor → `/recurring/:id/edit` (`data-testid="recurring-row-edit"`). Page-level `data-testid="recurring-page"`; row-level `data-testid="recurring-row"` plus per-cell testids (`recurring-row-description`, `-amount`, `-category`, `-tags`, `-recurrence`, `-anchor-date`, `-next-occurrence`). A `New recurring` anchor links to `/recurring/new` (`data-testid="recurring-new"`).
**Depends on**: 1, 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match DaisyUI / Tailwind conventions in `build-expenses.tsx`. Use real anchors (no client-side JS). The "—" fallback for Quarterly/Yearly stays only until Issue 14 wires the full algorithm; add a `// TODO(Issue 14)` comment.

---

### 17. Build `GET /recurring/new`

**Type**: WRITE
**Output**: A new route module `src/routes/recurring/build-create-recurring.tsx` registers `GET /recurring/new` (signed-in only). The handler loads categories via `listCategories` and tags via `listTags`, merges any flash form-state, and renders the shared form (task 15) in `mode='create'` with `action="/recurring"`. Wires the new builder into the same place `buildRecurring` is wired in `src/index.ts`.
**Depends on**: 15

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use `redirectWithError` / `redirectWithMessage` from `src/lib/redirects.tsx` for any handler-level redirect. No POST handler in this task.

---

### 18. Wire `POST /recurring`

**Type**: WRITE
**Output**: The route module from task 17 registers `POST /recurring` (signed-in only). The handler reads the body, runs `parseRecurringCreate` and `parseTagCsv`, on validation failure `redirectWithFormErrors` back to `/recurring/new` preserving every typed field. Resolves category via `findCategoryByName` and tags via `findTagsByNames`, computes the new-category / new-tag diff. If nothing is new, calls `createRecurringWithTags` and on success `redirectWithMessage` to `/recurring` with "Recurring template created."; on failure redirect with a friendly error. If anything is new, validates the new-category name via `parseNewCategoryName` when applicable and renders the consolidated confirmation page (task 19) seeded with the raw typed values and the normalized new-category / new-tag lists.
**Depends on**: 7, 13, 17

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse `signedInAccess`. Mirror the create-flow POST shape in `src/routes/expenses/build-expenses.tsx` — extract a shared "compute new-items diff" helper if it improves readability over duplicating that logic.

---

### 19. Generalize the consolidated confirmation page for recurring

**Type**: WRITE
**Output**: The existing "Confirm new items" page renderer is generalized to also serve recurring create + edit. Add an `entity: 'expense' | 'recurring'` prop alongside the existing `mode: 'create' | 'edit'` prop. The confirm form's `action` for recurring becomes `/recurring/confirm-create-new` (create) or `/recurring/:id/confirm-edit-new` (edit). The hidden inputs additionally carry `recurrence` and `anchorDate` for recurring entities. Page-level testids gain entity-specific variants: `confirm-recurring-create-new-page`, `confirm-recurring-edit-new-page`; button testids follow the same `name-action` convention. The list-of-new-items section is unchanged.
**Depends on**: 18

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match DaisyUI / Tailwind conventions already in the renderer. Submit-only — no client-side JS.

---

### 20. Wire `POST /recurring/confirm-create-new`

**Type**: WRITE
**Output**: The route module from task 17 registers `POST /recurring/confirm-create-new` (signed-in only). The handler reads `action`, `description`, `amount`, `category`, `tags`, `recurrence`, `anchorDate` from the body. On `action=cancel`, `redirectWithFormErrors` to `/recurring/new` with empty `fieldErrors` and every typed value preserved. On `action=confirm`, defensively re-runs `parseRecurringCreate`, `parseTagCsv`, and (when applicable) `parseNewCategoryName`, re-resolves existing tags / category, and calls `createManyAndRecurring`. On success `redirectWithMessage` to `/recurring` with "Recurring template created."; on failure / collision `redirectWithFormErrors` to `/recurring/new` with the appropriate field error and every typed value preserved.
**Depends on**: 7, 19

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse `signedInAccess`. Surface a collision message under `category` when a new category was being created, otherwise under `tags` — mirror the expense create-flow handler's choice.

---

### 21. Build `GET /recurring/:id/edit` + `POST /recurring/:id/edit`

**Type**: WRITE
**Output**: A new route module `src/routes/recurring/build-edit-recurring.tsx` registers `GET /recurring/:id/edit` (signed-in only): loads the template via `getRecurringById`; on missing id `redirectWithError` to `/recurring` with "Recurring template not found."; otherwise pre-populates a `RecurringFormValues` object from the loaded row (description, amount as plain decimal via the helper added in Issue 08 task 11, category name, tag names CSV alphabetized, recurrence, anchorDate) merged with any flash form-state, and renders the shared form (task 15) in `mode='edit'` with `action="/recurring/:id/edit"` and a Delete button (real anchor with `data-testid="recurring-edit-delete"`) linking to `/recurring/:id/delete`. Also registers `POST /recurring/:id/edit` mirroring the create-flow POST: validate, verify existence, resolve category/tags, compute diff, call `updateRecurringWithTags` when nothing is new (success → `redirectWithMessage` to `/recurring` with "Recurring template updated."), or render the confirmation page (task 19) when new items are introduced. Wires the builder into `src/index.ts` next to `buildRecurring`.
**Depends on**: 5, 9, 15

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use `redirectWithError` / `redirectWithMessage` consistently. Never return inline HTML for validation failures — always go through `redirectWithFormErrors`.

---

### 22. Wire `POST /recurring/:id/confirm-edit-new`

**Type**: WRITE
**Output**: The edit-route module from task 21 registers `POST /recurring/:id/confirm-edit-new` (signed-in only). The handler reads `action` plus every form field from the body. On `action=cancel`, `redirectWithFormErrors` to `/recurring/:id/edit` preserving typed values. On `action=confirm`, defensively re-runs validation, re-resolves existing tags / category, and calls `updateManyAndRecurring`. On success `redirectWithMessage` to `/recurring` with "Recurring template updated."; on failure / collision `redirectWithFormErrors` to `/recurring/:id/edit` with the appropriate field error and every typed value preserved.
**Depends on**: 9, 19, 21

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse `signedInAccess`. Surface collision messages consistently with task 20.

---

### 23. Build `GET /recurring/:id/delete` + `POST /recurring/:id/delete`

**Type**: WRITE
**Output**: The edit-route module from task 21 registers `GET /recurring/:id/delete` (signed-in only): loads the template; on missing id `redirectWithError` to `/recurring`. Renders a confirmation page with `data-testid="confirm-delete-recurring-page"` showing description, formatted amount, category, alphabetized tag list, recurrence (capitalized), and anchor date — each labeled with stable testids `confirm-delete-recurring-{description,amount,category,tags,recurrence,anchor-date}`. The page contains one `<form method="post" action="/recurring/:id/delete">` with a Confirm button (`data-testid="confirm-delete-recurring-confirm"`, DaisyUI `btn btn-error`) and a Cancel anchor back to `/recurring/:id/edit` (`data-testid="confirm-delete-recurring-cancel"`). Also registers `POST /recurring/:id/delete`: calls `deleteRecurring`; on success `redirectWithMessage` to `/recurring` with "Recurring template deleted."; on failure `redirectWithError` to `/recurring`.
**Depends on**: 5, 11, 21

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Match DaisyUI / Tailwind conventions used in the expense delete page. Use `formatCents`.

---

### 24. Add `/test/seed-generated-expense` dev route

**Type**: WRITE
**Output**: `src/routes/test/` gains a new route (or extends an existing dev test-routes module) registering `POST /test/seed-generated-expense` guarded by `isTestRouteEnabledFlag`, marked `// PRODUCTION:REMOVE`, that accepts JSON `{ recurringId: string; date: string; occurrenceDate: string; description?: string; amountCents?: number; categoryId?: string }` and inserts a single `expense` row with `recurringId` set, copying defaults from the linked template when fields are omitted. Returns `{ id }` JSON. Used by the Issue 13 e2e for the delete-preserves-past-generated-rows path.
**Depends on**: 5

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Mirror the structure of the existing `/test/*` routes. Mark the file / route handler `// PRODUCTION:REMOVE` so the final-audit pass strips it.

---

### 25. Playwright e2e: list + create with inline category/tag

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/01-list-and-create.spec.ts` signs in and exercises:

1. Visit `/recurring` while empty; assert empty-state rendering and the `recurring-new` anchor.
2. Click `recurring-new`; fill description, amount, anchor date today, recurrence `Monthly`, a brand-new category and a brand-new tag, submit; assert `confirm-recurring-create-new-page` is rendered and lists the create lines; click confirm; assert redirect to `/recurring`, success flash, the row appears with the right description/amount/category/tags/recurrence/anchor-date and `recurring-row-next-occurrence` is set to a `YYYY-MM-DD` one month after today (28th-shift applied where relevant).
3. Create a second template with an existing category and an existing tag; assert no confirmation page and the new row appears sorted alphabetically by description against the first.
**Depends on**: 16, 17, 18, 19, 20

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed helpers from `e2e-tests/support/`. Follow the structure of `e2e-tests/expenses/05-tags-and-inline-creation.spec.ts`.

---

### 26. Playwright e2e: edit (no new items + with new tag through confirmation)

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/02-edit.spec.ts` signs in, seeds a category, a tag, and a Monthly template, and exercises:

1. Click `recurring-row-edit`; assert every field's `value` matches the seeded template (description, amount as plain decimal, category, tags CSV alphabetized, recurrence `Monthly`, anchor date). Change the amount and submit; assert redirect to `/recurring`, success flash, the row's amount is updated.
2. Reload the edit page, append a brand-new tag to the tags CSV, submit; assert `confirm-recurring-edit-new-page` lists `Create tag '…'` only (no category line) and previews the updated values; click confirm; assert redirect to `/recurring` and the row's tags include the new tag alphabetized.
3. Reload the edit page, change the category to a brand-new name and add another brand-new tag, click cancel on the confirmation page; assert redirect back to `/recurring/:id/edit` with every typed field preserved via `value` and no DB changes.
**Depends on**: 21, 22

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed helpers. Follow the structure of `e2e-tests/expenses/10-edit-with-new-items.spec.ts`.

---

### 27. Playwright e2e: delete preserves past generated rows

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/03-delete.spec.ts` signs in, seeds a Monthly template, then `POST /test/seed-generated-expense` with the template id and a date one month before today, and exercises:

1. Visit `/expenses`; assert the seeded generated expense row is visible.
2. Visit `/recurring/:id/edit`, click `recurring-edit-delete`; on `confirm-delete-recurring-page` click cancel; assert redirect back to `/recurring/:id/edit` and no DB changes (template still listed on `/recurring`).
3. Re-open the delete page and click `confirm-delete-recurring-confirm`; assert redirect to `/recurring`, success flash, and the template row is gone.
4. Visit `/expenses`; assert the previously-seeded generated expense row is **still visible** with the same description / amount / date.
**Depends on**: 23, 24

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed helpers.

---

### 28. Playwright e2e: validation errors

**Type**: TEST
**Output**: New spec `e2e-tests/recurring/04-validation.spec.ts` signs in and exercises both `/recurring/new` and `/recurring/:id/edit`: submits description > 200 chars, amount `0`, amount with 3 decimals, anchor date `2025-02-30`, missing recurrence (or tampered to an invalid value via DOM); for each, asserts redirect back to the form with the appropriate field error rendered, every typed value preserved via `value`, and no row created / no row mutated.
**Depends on**: 18, 21

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Use the sign-in / seed helpers. Mirror the structure of the expense-form validation e2e.

---

### 29. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` reflects: the new `recurrence.nextOccurrenceAfter` monthly stub (and its Issue 14 follow-up); the new `listRecurring` / `getRecurringById` / `createRecurringWithTags` / `createManyAndRecurring` / `updateRecurringWithTags` / `updateManyAndRecurring` / `deleteRecurring` helpers in `expense-access`; the new `parseRecurringCreate` validator; the new shared `recurring-form` renderer; the `/recurring` list page replacement and the new `/recurring/new`, `/recurring/:id/edit`, `/recurring/confirm-create-new`, `/recurring/:id/confirm-edit-new`, and `/recurring/:id/delete` routes; the generalized consolidated confirmation page (`entity: 'expense'|'recurring'`); the dev-only `/test/seed-generated-expense` route. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 28

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link to Issue 08 (edit/delete expense) and Issue 14 (recurrence engine). Append a single `## [YYYY-MM-DD] ingest | Issue 13: recurring templates CRUD` entry to `log.md`.

---

### 30. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/13-recurring-crud/code-walkthrough/` covering the new `recurrence` stub, the recurring repo helpers, the recurring validators, the shared form renderer, the `/recurring` list / create / edit / delete routes, and the generalized confirmation renderer.
**Depends on**: 29

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 31. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A walkthrough under `Notes/walkthroughs/13-recurring-crud/ui-walkthrough/` showing the user-facing flows: empty `/recurring`; create-with-inline-category-and-tag through the confirmation page; the populated list with next-occurrence column; an edit-save flow; an edit flow that introduces a new tag and routes through the consolidated confirmation page; the delete-confirmation page; the post-delete list with the template gone but the seeded generated expense row still visible on `/expenses`.
**Depends on**: 30

Run `uvx showboat --help` and `uvx rodney --help` first to confirm current flags, then generate into the new directory.

---

### 32. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 31

---
