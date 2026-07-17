# src/lib/db/category-access.ts

Read/write helpers for the `category` table with retry logic and Result types.

## Types

- `CategoryRow` — `{ id, name }`
- `RenameCategoryInput` — `{ id, name }`
- `MergeCategoryInput` — `{ sourceId, targetId }`

## Functions

### listCategories(db): Result\<CategoryRow[], Error\>

Lists all categories sorted by case-insensitive name ASC.

### findCategoryByName(db, name): Result\<CategoryRow | null, Error\>

Case-insensitive lookup by name. Returns `null` for empty input or no match.

### createCategory(db, name): Result\<CategoryRow, Error\>

Creates a new category with lowercased name. Checks for duplicates before insert. Uses `crypto.randomUUID()` for ID.

### renameCategory(db, input): Result\<CategoryRow, Error\>

Renames a category. Checks for duplicates (case-insensitive, excluding self).

### countCategoryExpenses(db, categoryId): Result\<number, Error\>

Counts expenses referencing a category.

### mergeCategory(db, input): Result\<{ reassignedExpenseCount }, Error\>

Merges source into target: reassigns all expenses and recurring templates from source to target, then deletes source. Uses `db.batch()` for atomicity.

### deleteCategory(db, id): Result\<void, Error\>

Deletes a category. Fails if expenses or recurring templates reference it.

## Dependencies

- `drizzle-orm` — query builders
- `true-myth/result` — Result type
- `../../db/schema` — `category`, `expense`, `recurring`
- `../../local-types` — `DrizzleClient`
- `../db-helpers` — `withRetry`
