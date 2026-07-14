# category-access.ts

**Source:** `src/lib/db/category-access.ts`

## Purpose

Read/write helpers for the `category` table. Uses the same `withRetry` + `Result` pattern as `auth-access.ts`.

**Note:** This module was split from `expense-access.ts` to improve modularity.

## Types

### `CategoryRow`

```ts
interface CategoryRow {
  id: string
  name: string
}
```

### `RenameCategoryInput`

```ts
interface RenameCategoryInput {
  id: string
  name: string
}
```

### `MergeCategoryInput`

```ts
interface MergeCategoryInput {
  sourceId: string
  targetId: string
}
```

## Exports

### `listCategories(db): Promise<Result<CategoryRow[], Error>>`

- Public wrapper: `withRetry('listCategories', () => listCategoriesActual(db))`.
- Returns `{ id, name }` rows from `category`, sorted case-insensitively by `lower(name) ASC` (consistent with the list-view tiebreak convention).
- Used by the entry form on `/expenses` to populate the category `<select>`.

### `findCategoryByName(db, name): Promise<Result<CategoryRow | null, Error>>`

- Public wrapper: `withRetry('findCategoryByName', () => findCategoryByNameActual(db, name))`.
- Trims the input and matches case-insensitively via `lower(category.name) = lower(?)`. Returns `Result.ok(null)` for empty input or no match.
- Added in Issue 05 for the inline-category-creation flow on the entry form: callers use it to decide whether to go straight to `createExpense` (match found) or render the consolidated confirmation page (no match).

### `createCategory(db, name): Promise<Result<CategoryRow, Error>>`

- Added in Issue 09. Public wrapper: `withRetry('createCategory', () => createCategoryActual(db, name))`.
- Trims and lowercases the name, rejects empty input, checks for existing names via `findCategoryByNameActual`, and catches database unique/constraint failures as friendly duplicate errors.
- Returns the inserted `{ id, name }` row.

### `renameCategory(db, input): Promise<Result<CategoryRow, Error>>`

- Added in Issue 09. Public wrapper: `withRetry('renameCategory', () => renameCategoryActual(db, input))`.
- Verifies the source category exists, lowercases the new name, rejects case-insensitive duplicates on any other category, updates `name` and `updatedAt`, and returns `{ id, name }`.
- The route performs a preflight duplicate lookup to offer merge confirmation before calling this helper for simple renames.

### `countCategoryExpenses(db, categoryId): Promise<Result<number, Error>>`

- Added in Issue 09 for the merge confirmation page.
- Wraps the private expense-reference count in `withRetry`.

### `mergeCategory(db, input): Promise<Result<{ reassignedExpenseCount: number }, Error>>`

- Added in Issue 09. Public wrapper: `withRetry('mergeCategory', () => mergeCategoryActual(db, input))`.
- Rejects identical source/target ids and verifies both categories exist.
- Counts source expenses before mutation, then atomically batches:
  1. update every `expense.categoryId` from source to target,
  2. update every `recurring.categoryId` from source to target,
  3. delete the source category.
- Returns the number of reassigned source expenses.

### `deleteCategory(db, id): Promise<Result<void, Error>>`

- Added in Issue 09. Public wrapper: `withRetry('deleteCategory', () => deleteCategoryActual(db, id))`.
- Verifies the category exists.
- Blocks deletion when regular expenses reference it, returning an error that includes the exact expense count.
- Blocks deletion when recurring templates reference it.
- Deletes only unreferenced categories; FK `restrict` remains a database-level backstop.

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`
- [db/schema.md](../../db/schema.md) — `category` and `recurring` tables.
- [expense-access.md](./expense-access.md) — expense operations (category operations were moved from this file)
- [routes/build-categories.md](../../routes/build-categories.md) — category management caller (Issue 09).
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — uses `listCategories` and `findCategoryByName`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
