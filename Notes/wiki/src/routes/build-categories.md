# build-categories.tsx

**Source:** `src/routes/build-categories.tsx`

## Purpose

Signed-in category-management page for `/categories`. Issue 09 replaces the placeholder with a no-JavaScript management UI and POST handlers for category creation, simple rename, rename collision merge confirmation, merge confirm/cancel, and delete.

## Export

### `buildCategories(app): void`

Registers all `/categories` routes behind:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

## Routes

### `GET /categories`

- Loads categories via `listCategories(db)`.
- Reads and clears any `FORM_ERRORS` cookie with `readAndClearFormState(c)`.
- Renders:
  - Create form (`category-create-name`, `create-category-action`).
  - Category table (`categories-table`, `category-row`, `category-row-name`).
  - Per-row rename form (`category-rename-name`, `rename-category-action`).
  - Per-row delete form (`delete-category-action`).

### `POST /categories`

- Parses `{ name }` with `parseCategoryCreate`.
- On validation or uniqueness errors, redirects back with `redirectWithFormErrors` and sticky `name`.
- On success, calls `createCategory` and redirects with `Category created.`

### `POST /categories/:id/rename`

- Parses route `id` + body `name` with `parseCategoryRename`.
- If the normalized target name exists on another category, renders the merge confirmation page instead of mutating immediately.
- Otherwise calls `renameCategory` and redirects with `Category renamed.`

### `POST /categories/merge-confirm`

- Cancel branch redirects back with `Category merge canceled.`
- Confirm branch revalidates `sourceId`/`targetId`, reloads source/target rows, calls `mergeCategory`, and redirects with `Categories merged.`

### `POST /categories/:id/delete`

- Parses the route id with `parseCategoryDelete`.
- Calls `deleteCategory`.
- Referenced categories redirect back with the helper's count-bearing error; unreferenced categories redirect with `Category deleted.`

## Merge confirmation page

Rendered when a rename target already exists case-insensitively. Shows:

- Source category (`merge-source-name`)
- Target category (`merge-target-name`)
- Reassignment count (`merge-expense-count`, text includes `All N expenses will be reassigned`)
- Confirm and cancel controls (`confirm-merge-category-action`, `cancel-merge-category-action`)

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper used to render.
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate.
- [constants.md](../constants.md) — `PATHS.CATEGORIES`, `STANDARD_SECURE_HEADERS`.
- [../lib/expense-validators.md](../lib/expense-validators.md) — category-management validators.
- [../lib/db/category-access.md](../lib/db/category-access.md) — category repository helpers.
- [../lib/form-state.md](../lib/form-state.md) — field-error/sticky-value redirect flow.
- [../../e2e-tests/expenses/12-category-management.spec.md](../../e2e-tests/expenses/12-category-management.spec.md) — Playwright coverage.

---

See [source-code.md](../../source-code.md) for the full catalog.
