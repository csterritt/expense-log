# tag-access.ts

**Source:** `src/lib/db/tag-access.ts`

## Purpose

Read/write helpers for the `tag` table. Uses the same `withRetry` + `Result` pattern as `auth-access.ts`.

**Note:** This module was split from `expense-access.ts` to improve modularity.

## Types

### `TagRow`

```ts
interface TagRow {
  id: string
  name: string
}
```

### `RenameTagInput`

```ts
interface RenameTagInput {
  id: string
  name: string
}
```

### `MergeTagInput`

```ts
interface MergeTagInput {
  sourceId: string
  targetId: string
}
```

## Exports

### `findTagsByNames(db, names): Promise<Result<TagRow[], Error>>`

- Added in Issue 06. Public wrapper: `withRetry('findTagsByNames', () => findTagsByNamesActual(db, names))`.
- Trims and lowercases every entry, drops empty/whitespace-only entries, de-duplicates, and short-circuits to `Result.ok([])` when the effective list is empty (no query issued).
- Otherwise issues a single `WHERE lower(tag.name) IN (...)` lookup. Used by the entry-form POST to compute the existing-vs-new diff against the typed CSV.

### `listTags(db): Promise<Result<TagRow[], Error>>`

- Public wrapper: `withRetry('listTags', () => listTagsActual(db))`.
- Returns `{ id, name }` rows from `tag`, sorted case-insensitively by `lower(name) ASC` (consistent with the list-view tiebreak convention).
- Used by the entry form on `/expenses` to populate the tag list.

### `createTag(db, name): Promise<Result<TagRow, Error>>`

- Added in Issue 10. Public wrapper: `withRetry('createTag', () => createTagActual(db, name))`.
- Trims and lowercases the name, rejects empty input, checks for existing names via a `lower(tag.name) = lower(?)` query, and catches database unique/constraint failures as friendly duplicate errors.
- Returns the inserted `{ id, name }` row.

### `renameTag(db, input): Promise<Result<TagRow, Error>>`

- Added in Issue 10. Public wrapper: `withRetry('renameTag', () => renameTagActual(db, input))`.
- Verifies the source tag exists, lowercases the new name, rejects case-insensitive duplicates on any other tag, updates `name` and `updatedAt`, and returns `{ id, name }`.
- The route performs a preflight duplicate lookup to offer merge confirmation before calling this helper for simple renames.

### `countTagExpenses(db, tagId): Promise<Result<number, Error>>`

- Added in Issue 10. Public wrapper: `withRetry('countTagExpenses', () => countTagExpensesActual(db, tagId))`.
- Counts distinct `expenseTag.expenseId` values for the given `tagId`. Used by the rename route to compute the reassignment count shown on the merge confirmation page.

### `mergeTag(db, input): Promise<Result<{ reassignedExpenseCount: number }, Error>>`

- Added in Issue 10. Public wrapper: `withRetry('mergeTag', () => mergeTagActual(db, input))`.
- Rejects identical source/target ids and verifies both tags exist.
- Counts source expenses before mutation (`countExpensesForTag`).
- **Deduplication**: identifies which source `expenseTag` rows would collide on `(expenseId, tagId)` with existing target rows. Non-colliding rows are updated to point at the target; colliding source rows are simply deleted.
- **Atomic batch** (`db.batch`):
  1. Update non-colliding `expenseTag` rows: set `tagId` from source to target.
  2. Delete all remaining `expenseTag` rows still pointing at source (the colliding ones).
  3. Defensively repoint `recurringTag` rows from source to target (same dedupe logic applied to recurring templates).
  4. Delete all remaining `recurringTag` rows for source.
  5. Delete the source `tag` row.
  6. Touch the target tag's `updatedAt`.
- Returns the number of distinct source expenses (`reassignedExpenseCount`) that were reassigned or deduplicated.

### `deleteTag(db, id): Promise<Result<void, Error>>`

- Added in Issue 10. Public wrapper: `withRetry('deleteTag', () => deleteTagActual(db, id))`.
- Verifies the tag exists.
- Blocks deletion when any `expenseTag` row references the tag, returning a count-bearing error message (`"N expense(s) reference this tag."`).
- Deletes only unreferenced tags; FK `restrict` on `expenseTag.tagId` remains the database-level backstop.

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`
- [db/schema.md](../../db/schema.md) — `tag`, `expenseTag`, and `recurringTag` tables.
- [expense-access.md](./expense-access.md) — expense operations (tag operations were moved from this file)
- [routes/build-tags.md](../../routes/build-tags.md) — tag management caller (Issue 10).
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — uses `listTags` and `findTagsByNames`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
