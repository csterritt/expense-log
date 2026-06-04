# confirm-helpers.ts

Race-tolerant create-or-reuse helpers for the confirmation handlers, plus a shared resolution pipeline for tags and categories across all confirm flows.

## Overview

Both `createOrReuseTag` and `createOrReuseCategory` attempt to insert a new row. If the DB-level unique constraint fires (another request created the same name between the initial form POST and the confirmation POST), they silently look up and return the already-existing row instead of propagating the error. This makes the confirmation handler idempotent with respect to concurrent writers — consistent with the PRD's no-per-user-ownership rule where all signed-in users share the same tag and category sets.

## Exports

### `CategoryRow` / `TagRow`

Simple row interfaces:
- `id: string`
- `name: string`

### `createOrReuseTag(db, rawName)`

Attempts to create a new tag with the given name. If the DB rejects the insert due to the unique-lowercase index (a race with another writer), looks up and returns the existing row instead. Returns `Result<TagRow, Error>` via `withRetry`.

### `createOrReuseCategory(db, rawName)`

Attempts to create a new category with the given name. Same race-tolerant fallback pattern as `createOrReuseTag`. Returns `Result<CategoryRow, Error>` via `withRetry`.

### `ResolvedConfirmItems`

Discriminated union returned by `resolveConfirmTagsAndCategory`:
- `ok: true` — contains `existingTagIds`, `newTagNames`, `rawNewTagsPreserved`, `existingCategoryId`, `newCategoryName`, `existingCategoryName`
- `ok: false` with `kind`: `'tag-list-error' | 'tag-input-error' | 'category-lookup-error' | 'new-category-name-error'`

### `resolveConfirmTagsAndCategory(db, tagIds, newTagsRaw, categoryName)`

Shared resolution pipeline for all three confirmation handlers (expense create, expense edit, recurring create/edit).

Steps:
1. Fetches the full tag list via `listTags`.
2. Parses submitted `tagId[]` + `newTags` inputs via `parseTagInputs`.
3. Looks up the submitted category name via `findCategoryByName`.
4. When the category is new, validates it via `parseNewCategoryName`.

Returns a discriminated union so callers can handle each failure branch and propagate errors to the correct redirect target without duplicating logic across handlers.

## Cross-references

- See [expense-confirm-post-handler.ts](../../routes/expenses/expense-confirm-post-handler.md) and [build-edit-expense.tsx](../../routes/expenses/build-edit-expense.md) for expense-side consumers.
- See [build-create-recurring.tsx](../../routes/recurring/build-create-recurring.md) and [build-edit-recurring.tsx](../../routes/recurring/build-edit-recurring.md) for recurring-side consumers.
- See [expense-confirm-handler.spec.ts](../../../../tests/expense-confirm-handler.spec.md), [recurring-confirm-handler.spec.ts](../../../../tests/recurring-confirm-handler.spec.md), and [recurring-edit-confirm-handler.spec.ts](../../../../tests/recurring-edit-confirm-handler.spec.md) for tests.
