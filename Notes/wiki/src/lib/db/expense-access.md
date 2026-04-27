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
  from: string
  to: string
}
```

### `TagRow`

```ts
interface TagRow {
  id: string
  name: string
}
```

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
- Private `listExpensesActual` joins `expense` -> `category` to fetch the category name, filters by `expense.date BETWEEN filters.from AND filters.to` (inclusive), and sorts by `date DESC`, then `lower(description) ASC` for the case-insensitive tiebreak.
- Hydrates `tagNames` via a single secondary query that joins `expenseTag` -> `tag`, grouped by `expenseId` in a `Map`.

### `listTags(db): Promise<Result<TagRow[], Error>>`

- Public wrapper: `withRetry('listTags', () => listTagsActual(db))`.
- Returns `{ id, name }` rows from `tag`, sorted by `asc(tag.name)`.
- Added in Task 1 of the progressive-enhancement slice. Used by the GET handler on `/expenses` to embed a JSON list of all tags for the client-side chip picker.

### `listCategories(db): Promise<Result<CategoryRow[], Error>>`

- Public wrapper: `withRetry('listCategories', () => listCategoriesActual(db))`.
- Returns `{ id, name }` rows from `category`, sorted case-insensitively by `lower(name) ASC` (consistent with the list-view tiebreak convention).
- Used by the entry form on `/expenses` to populate the category `<select>` (Issue 03) and later to embed JSON for the client-side combobox.

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

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`
- [db/schema.md](../../db/schema.md) — `expense`, `category`, `tag`, `expenseTag` tables.
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — primary caller (GET renders the list + form, POST calls `createExpense`).
- [routes/test/database.md](../routes/test/database.md) — `POST /test/database/seed-expenses` and `POST /test/database/seed-categories` populate rows for tests.

---

See [source-code.md](../../../source-code.md) for the full catalog.
