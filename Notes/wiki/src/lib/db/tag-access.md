# src/lib/db/tag-access.ts

Read/write helpers for the `tag` table with retry logic and Result types.

## Types

- `TagRow` — `{ id, name }`
- `RenameTagInput` — `{ id, name }`
- `MergeTagInput` — `{ sourceId, targetId }`

## Functions

### findTagsByNames(db, names): Result\<TagRow[], Error\>

Case-insensitive bulk lookup by names. Trims, lowercases, and deduplicates before querying with `IN (...)`. Empty list short-circuits to `[]`.

### listTags(db): Result\<TagRow[], Error\>

Lists all tags sorted by case-insensitive name ASC.

### listTagsByIds(db, ids): Result\<TagRow[], Error\>

Looks up tags by ID array. Unknown IDs silently omitted. Empty input short-circuits to `[]`.

### createTag(db, name): Result\<TagRow, Error\>

Creates a new tag with lowercased name. Checks for duplicates before insert. Uses ULID for ID.

### renameTag(db, input): Result\<TagRow, Error\>

Renames a tag. Checks for duplicates (case-insensitive, excluding self).

### countTagExpenses(db, tagId): Result\<number, Error\>

Counts distinct expenses referencing a tag via `expenseTag` join table.

### mergeTag(db, input): Result\<{ reassignedExpenseCount }, Error\>

Merges source into target: reassigns non-colliding `expenseTag` and `recurringTag` rows from source to target, deletes colliding duplicates, then deletes source tag. Uses `db.batch()` for atomicity.

### deleteTag(db, id): Result\<void, Error\>

Deletes a tag. Fails if expenses reference it (via `expenseTag` join).

## Dependencies

- `drizzle-orm` — query builders
- `true-myth/result` — Result type
- `ulid` — ID generation
- `../../db/schema` — `tag`, `expenseTag`, `recurringTag`
- `../../local-types` — `DrizzleClient`
- `../db-helpers` — `withRetry`
