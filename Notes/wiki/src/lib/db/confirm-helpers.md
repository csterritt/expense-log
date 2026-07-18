# src/lib/db/confirm-helpers.ts

Race-tolerant create-or-reuse helpers and shared confirmation pipeline for expense/recurring confirmation handlers.

## Functions

### createOrReuseTag(db, rawName): Result\<TagRow, Error\>

Attempts to create a new tag. If the DB rejects the insert due to a unique constraint (race condition), looks up and returns the existing row instead. Uses ULID for IDs.

### createOrReuseCategory(db, rawName): Result\<CategoryRow, Error\>

Same pattern as `createOrReuseTag` but for categories. Race-tolerant: on unique constraint violation, returns the existing row.

### resolveConfirmTagsAndCategory(db, tagIds, newTagsRaw, categoryName): Promise\<ResolvedConfirmItems\>

Shared resolution pipeline for all three confirmation handlers (expense create, expense edit, recurring create/edit):

1. Fetches full tag list via `listTags`
2. Parses `tagId[]` + `newTags` via `parseTagInputs`
3. Looks up category by name via `findCategoryByName`
4. If category is new, validates name via `parseNewCategoryName`

Returns a discriminated union `ResolvedConfirmItems`:
- `{ ok: true, existingTagIds, newTagNames, ... }` — success
- `{ ok: false, kind: 'tag-list-error' }` — tag list fetch failed
- `{ ok: false, kind: 'tag-input-error', fieldErrors, rawNewTagsPreserved }` — tag parsing failed
- `{ ok: false, kind: 'category-lookup-error' }` — category lookup failed
- `{ ok: false, kind: 'new-category-name-error', message }` — new category name invalid

## Consumers

- `src/routes/expenses/expense-confirm-post-handler.ts`
- `src/routes/expenses/build-edit-expense.tsx`
- `src/routes/recurring/build-create-recurring.tsx`
- `src/routes/recurring/build-edit-recurring.tsx`

## Dependencies

- `drizzle-orm` — `sql`
- `true-myth/result` — Result type
- `ulid` — ID generation
- `../../db/schema` — `category`, `tag`
- `../../local-types` — `DrizzleClient`
- `../db-helpers` — `withRetry`
- `./tag-access` — `listTags`
- `./category-access` — `findCategoryByName`
- `../expense-validators` — `parseTagInputs`, `parseNewCategoryName`
