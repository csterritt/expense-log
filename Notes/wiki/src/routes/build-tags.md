# build-tags.tsx

**Source:** `src/routes/build-tags.tsx`

## Purpose

Signed-in tag-management page for `/tags`. Issue 10 replaces the placeholder with a no-JavaScript management UI and POST handlers for tag creation, simple rename, rename collision merge confirmation, merge confirm/cancel, and delete. Closely parallel to [`build-categories.tsx`](build-categories.md) from Issue 09.

## Export

### `buildTags(app): void`

Registers all `/tags` routes behind:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

## Routes

### `GET /tags`

- Loads tags via `listTags(db)`.
- Reads and clears any `FORM_ERRORS` cookie with `readAndClearFormState(c)`.
- Renders:
  - Create form (`tag-create-name`, `create-tag-action`, `tag-create-name-error`).
  - Tag table (`tags-table`, `tag-row`, `tag-row-name`).
  - Per-row rename form (`tag-rename-name`, `rename-tag-action`).
  - Per-row delete form (`delete-tag-action`).
  - Empty state (`tags-empty-state`) when no tags exist.
  - `back-to-expenses-action` anchor back to `/expenses`.

### `POST /tags`

- Parses `{ name }` with `parseTagCreate`.
- On validation or uniqueness errors, redirects back with `redirectWithFormErrors` and sticky `name`.
- On success, calls `createTag` and redirects with `Tag created.`

### `POST /tags/:id/rename`

- Parses route `id` + body `name` with `parseTagRename`.
- If the normalized target name exists on another tag (case-insensitive lookup via `findTagByName`), fetches the expense count for the source tag via `countTagExpenses` and renders the merge confirmation page.
- Otherwise calls `renameTag` and redirects with `Tag renamed.`

### `POST /tags/merge-confirm`

- Cancel branch redirects back with `Tag merge canceled.`
- Confirm branch revalidates `sourceId`/`targetId` with `parseTagMergeConfirm`, reloads source/target rows from `listTags`, calls `mergeTag`, and redirects with `Tags merged.`

### `POST /tags/:id/delete`

- Parses the route id with `parseTagDelete`.
- Calls `deleteTag`.
- Referenced tags redirect back with the helper's count-bearing error message; unreferenced tags redirect with `Tag deleted.`

## Merge confirmation page

Rendered when a rename target already exists case-insensitively. Shows:

- Source tag (`merge-source-name`)
- Target tag (`merge-target-name`)
- Expense reassignment count (`merge-expense-count`, text includes `All N expenses will be reassigned`)
- Confirm and cancel controls (`confirm-merge-tag-action`, `cancel-merge-tag-action`)
- Wrapper testid: `tag-merge-confirm-page`

## Key differences from categories

- Reference counting is via `expenseTag` (join table), not a direct `expense.tagId` FK. `deleteTag` and `countTagExpenses` query `expenseTag`.
- Merge (`mergeTag`) also repoints `recurringTag` rows defensively, with dedupe for recurring templates that already hold both source and target.
- Merge deduplicates `expenseTag` rows: expenses that already reference both source and target get only the existing target link; colliding source rows are deleted rather than updated.

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper used to render.
- [build-categories.md](build-categories.md) — parallel Issue 09 implementation used as reference.
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate.
- [constants.md](../constants.md) — `PATHS.TAGS`, `STANDARD_SECURE_HEADERS`.
- [../lib/expense-validators.md](../lib/expense-validators.md) — tag-management validators.
- [../lib/db/expense-access.md](../lib/db/expense-access.md) — tag repository helpers.
- [../lib/form-state.md](../lib/form-state.md) — field-error/sticky-value redirect flow.
- [../../e2e-tests/expenses/13-tag-management.spec.md](../../e2e-tests/expenses/13-tag-management.spec.md) — Playwright coverage.

---

See [source-code.md](../../source-code.md) for the full catalog.
