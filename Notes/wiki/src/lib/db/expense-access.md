# expense-access.ts

**Source:** `src/lib/db/expense-access.ts`

## Purpose

Read/write helpers for the `expense` table and its joins to `category`, `tag`, and `expenseTag`. Uses the same `withRetry` + `Result` pattern as `auth-access.ts`.

## Types

### `ExpenseRow`

```ts
interface ExpenseRow {
  id: string
  date: string
  description: string
  categoryName: string
  amountCents: number
  tagNames: string[]
}
```

### `ListExpenseFilters`

```ts
interface ListExpenseFilters {
  from?: string
  to?: string
  description?: string
  categoryId?: string
  tagIds?: string[]
  tagMode?: 'or' | 'and'
}
```

Added in Issue 11 for the expense list filter bar. All fields are optional.

### `CategoryRow`

```ts
interface CategoryRow {
  id: string
  name: string
}
```

### `CreateExpenseInput`

```ts
interface CreateExpenseInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
}
```

### `CreateCategoryAndExpenseInput`

```ts
interface CreateCategoryAndExpenseInput {
  newCategoryName: string
  date: string
  description: string
  amountCents: number
}
```

## Exports

### `listExpenses(db, filters): Promise<Result<ExpenseRow[], Error>>`

- Public wrapper: calls `withRetry('listExpenses', () => listExpensesActual(db, filters))`.
- Private `listExpensesActual` joins `expense` -> `category` to fetch the category name. Filters by:
  - `expense.date >= filters.from` (when provided)
  - `expense.date <= filters.to` (when provided)
  - `lower(description) LIKE lower('%description%')` (case-insensitive substring, when provided)
  - `categoryId` exact match (when provided)
  - Tag filtering: when `tagIds` provided, uses subqueries on `expenseTag`:
    - `tagMode === 'and'`: expense must have all listed tags (uses `GROUP BY expenseId HAVING count(distinct tagId) = N`)
    - `tagMode === 'or'` (default): expense must have at least one listed tag
- Sorts by `date DESC`, then `lower(description) ASC` for the case-insensitive tiebreak.
- Hydrates `tagNames` via a single secondary query that joins `expenseTag` -> `tag`, grouped by `expenseId` in a `Map`.
- Issue 11 extended the filter support from simple date ranges to the full filter bar.

### `listCategories(db): Promise<Result<CategoryRow[], Error>>`

- Public wrapper: `withRetry('listCategories', () => listCategoriesActual(db))`.
- Returns `{ id, name }` rows from `category`, sorted case-insensitively by `lower(name) ASC` (consistent with the list-view tiebreak convention).
- Used by the entry form on `/expenses` to populate the category `<select>`.

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

### `createExpense(db, input): Promise<Result<{ id: string }, Error>>`

- Public wrapper: `withRetry('createExpense', () => createExpenseActual(db, input))`.
- Verifies that `input.categoryId` exists in the `category` table; returns `Result.err` with a "Category not found" message otherwise.
- Generates a new `id` via `crypto.randomUUID()` and inserts a row into `expense` with `createdAt`/`updatedAt` set to the current `Date`. No tag handling in this slice (tags arrive in a later issue).
- Inputs are assumed already validated by the caller (the POST handler in `build-expenses.tsx` does this via `parseAmount`, `isValidYmd`, and a description length check).

### `findCategoryByName(db, name): Promise<Result<CategoryRow | null, Error>>`

- Public wrapper: `withRetry('findCategoryByName', () => findCategoryByNameActual(db, name))`.
- Trims the input and matches case-insensitively via `lower(category.name) = lower(?)`. Returns `Result.ok(null)` for empty input or no match.
- Added in Issue 05 for the inline-category-creation flow on the entry form: callers use it to decide whether to go straight to `createExpense` (match found) or render the consolidated confirmation page (no match).

### `createCategoryAndExpense(db, input): Promise<Result<{ categoryId, expenseId }, Error>>`

- Public wrapper: `withRetry('createCategoryAndExpense', () => createCategoryAndExpenseActual(db, input))`.
- Trims `input.newCategoryName`, lowercases it, and inserts both the new `category` row and a matching `expense` row inside a single `db.batch([...])` so a failure on either statement rolls the other back.
- Generates fresh UUIDs for both rows and sets `createdAt`/`updatedAt` to a single `new Date()` captured at call time.
- A race-condition unique-name collision is recognised heuristically (`/unique|constraint/i` on the thrown message) and surfaces as `Result.err(new Error(\`A category named "..." already exists.\`))`; callers in `build-expenses.tsx` map that error straight back to the `category` field via `redirectWithFormErrors`.
- Note: kept around as the simpler category-only helper from Issue 05. Issue 06's combined-creation flow uses the more general `createManyAndExpense` below; this helper is currently unused by the route handlers but remains a useful reference.

### `findTagsByNames(db, names): Promise<Result<TagRow[], Error>>`

- Added in Issue 06. Public wrapper: `withRetry('findTagsByNames', () => findTagsByNamesActual(db, names))`.
- Trims and lowercases every entry, drops empty/whitespace-only entries, de-duplicates, and short-circuits to `Result.ok([])` when the effective list is empty (no query issued).
- Otherwise issues a single `WHERE lower(tag.name) IN (...)` lookup. Used by the entry-form POST to compute the existing-vs-new diff against the typed CSV.

### `createExpenseWithTags(db, input): Promise<Result<{ id }, Error>>`

- Added in Issue 06. Public wrapper: `withRetry('createExpenseWithTags', () => createExpenseWithTagsActual(db, input))`.
- Verifies `input.categoryId` exists, then inserts the expense row plus one `expenseTag` link per (de-duplicated) tag id. With no tag ids, runs the bare `expense` insert; with tags, batches everything atomically.
- Used by the entry-form POST when both the category and every tag already exist (no confirmation page needed).

### `createManyAndExpense(db, input): Promise<Result<{ categoryId, expenseId, createdTagIds }, Error>>`

- Added in Issue 06. Public wrapper: `withRetry('createManyAndExpense', () => createManyAndExpenseActual(db, input))`.
- Accepts `{ newCategoryName | existingCategoryId, newTagNames, existingTagIds, date, description, amountCents }`. Exactly one of `newCategoryName` / `existingCategoryId` must be supplied — both/neither return `Result.err`.
- In a single `db.batch([...])` inserts (a) the optional new category row (lower-cased, fresh UUID), (b) one `tag` row per de-duplicated `newTagNames` entry (lower-cased, fresh UUIDs), (c) the `expense` row, (d) one `expenseTag` row per (de-duplicated combined existing + new) tag id.
- Unique-name collisions on `category.name` or `tag.name` (`/unique|constraint/i`) surface as `Result.err(new Error('One of the new names collides with an existing row. Please try again.'))`; the confirm POST surfaces this under `category` when a new category was being created and otherwise under `tags`.

### `getExpenseById(db, id): Promise<Result<ExpenseDetailRow | null, Error>>`

- Added in Issue 08. Public wrapper: `withRetry('getExpenseById', () => getExpenseByIdActual(db, id))`.
- Returns the full row including `categoryId`, `categoryName`, alphabetised `tagNames`, and the parallel `tagIds` array. `Result.ok(null)` for an unknown id (or empty input).
- Used by the edit page GET to pre-populate the form, by the edit POST to verify the row exists before mutating, and by the delete confirm GET to display details.
- `ExpenseDetailRow` extends `ExpenseRow` with `categoryId: string` and `tagIds: string[]`.

### `updateExpenseWithTags(db, input): Promise<Result<{ id }, Error>>`

- Added in Issue 08. Public wrapper: `withRetry('updateExpenseWithTags', () => updateExpenseWithTagsActual(db, input))`.
- Input shape: `{ id, date, description, categoryId, amountCents, tagIds }`. Verifies the expense and category exist (friendly `Result.err` otherwise).
- Single `db.batch([...])`: updates the expense row (`description`, `amountCents`, `categoryId`, `date`, `updatedAt`), deletes every `expenseTag` row for that expense, then inserts one `expenseTag` row per de-duplicated id in `tagIds`.
- Used by the edit POST when both the category and every tag already exist (no confirmation page needed). Idempotent: replaying with the same `tagIds` produces no duplicate links.

### `updateManyAndExpense(db, input): Promise<Result<{ id, categoryId, createdTagIds }, Error>>`

- Added in Issue 08. Public wrapper: `withRetry('updateManyAndExpense', () => updateManyAndExpenseActual(db, input))`.
- Mirrors `createManyAndExpense` but updates an existing expense instead of inserting one. Input: `{ id, newCategoryName | existingCategoryId, newTagNames, existingTagIds, date, description, amountCents }`. Exactly one of `newCategoryName` / `existingCategoryId` must be supplied.
- Single `db.batch([...])` that (a) optionally inserts a new lower-cased category row, (b) inserts one `tag` row per de-duplicated lower-cased entry in `newTagNames`, (c) updates the existing `expense` row to point at the resolved category id, (d) deletes the prior `expenseTag` link set, then (e) inserts one `expenseTag` row per id in the combined existing + newly-created set.
- A unique-name collision surfaces as `Result.err(new Error('One of the new names collides with an existing row. Please try again.'))` and rolls back the entire batch. The confirm-edit POST surfaces this under `category` when a new category was being created and otherwise under `tags`.

### `deleteExpense(db, id): Promise<Result<void, Error>>`

- Added in Issue 08. Public wrapper: `withRetry('deleteExpense', () => deleteExpenseActual(db, id))`.
- Verifies the row exists, then issues `delete from expense where id = ?`. The `ON DELETE CASCADE` on `expenseTag` cleans up link rows automatically; referenced `category` and `tag` rows are left intact.
- Returns a friendly `Result.err` for an unknown id.

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
- [db/schema.md](../../db/schema.md) — `expense`, `category`, `tag`, `expenseTag`, `recurringTag`, and `recurring` tables.
- [routes/build-categories.md](../../routes/build-categories.md) — category management caller (Issue 09).
- [routes/build-tags.md](../../routes/build-tags.md) — tag management caller (Issue 10).
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — primary caller for the list + create flow.
- [routes/expenses/build-edit-expense.md](../routes/expenses/build-edit-expense.md) — edit + delete flow caller (Issue 08): `getExpenseById`, `updateExpenseWithTags`, `updateManyAndExpense`, `deleteExpense`.
- [routes/build-summary.md](../routes/build-summary.md) — summary page caller (Issue 12): `summarize`, `listCategories`, `listTags`.
- [routes/test/database.md](../routes/test/database.md) — `POST /test/database/seed-expenses` and `POST /test/database/seed-categories` populate rows for tests.

---

See [source-code.md](../../../source-code.md) for the full catalog.
