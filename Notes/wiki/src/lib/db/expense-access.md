# expense-access.ts

**Source:** `src/lib/db/expense-access.ts`

## Purpose

Read/write helpers for the `expense` table and its joins to `category`, `tag`, and `expenseTag`. Uses the same `withRetry` + `Result` pattern as `auth-access.ts`.

**Note:** Category operations have been moved to [category-access.ts](./category-access.md) and tag operations to [tag-access.ts](./tag-access.md). Summary operations were moved to [summary-access.ts](./summary-access.md) (deleted 2026-05-22).

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
  recurringId: string | null
}
```

`recurringId` is non-null when the expense was generated from a recurring template. The recurring badge (`↻`) is rendered in the list when this field is set.

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

### `CreateExpenseWithTagsInput`

```ts
interface CreateExpenseWithTagsInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
  tagIds: string[]
}
```

### `ExpenseDetailRow`

```ts
interface ExpenseDetailRow extends ExpenseRow {
  categoryId: string
  tagIds: string[]
}
```

### `UpdateExpenseWithTagsInput`

```ts
interface UpdateExpenseWithTagsInput {
  id: string
  date: string
  description: string
  categoryId: string
  amountCents: number
  tagIds: string[]
}
```

### `UpdateManyAndExpenseInput`

```ts
interface UpdateManyAndExpenseInput {
  id: string
  newCategoryName: string | null
  existingCategoryId: string | null
  newTagNames: string[]
  existingTagIds: string[]
  date: string
  description: string
  amountCents: number
}
```

### `CreateManyAndExpenseInput`

```ts
interface CreateManyAndExpenseInput {
  newCategoryName: string | null
  existingCategoryId: string | null
  newTagNames: string[]
  existingTagIds: string[]
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

### `createExpense(db, input): Promise<Result<{ id: string }, Error>>`

- Public wrapper: `withRetry('createExpense', () => createExpenseActual(db, input))`.
- Verifies that `input.categoryId` exists in the `category` table; returns `Result.err` with a "Category not found" message otherwise.
- Generates a new `id` via `crypto.randomUUID()` and inserts a row into `expense` with `createdAt`/`updatedAt` set to the current `Date`. No tag handling in this slice (tags arrive in a later issue).
- Inputs are assumed already validated by the caller (the POST handler in `build-expenses.tsx` does this via `parseAmount`, `isValidYmd`, and a description length check).

### `createCategoryAndExpense(db, input): Promise<Result<{ categoryId, expenseId }, Error>>`

- Public wrapper: `withRetry('createCategoryAndExpense', () => createCategoryAndExpenseActual(db, input))`.
- Trims `input.newCategoryName`, lowercases it, and inserts both the new `category` row and a matching `expense` row inside a single `db.batch([...])` so a failure on either statement rolls the other back.
- Generates fresh UUIDs for both rows and sets `createdAt`/`updatedAt` to a single `new Date()` captured at call time.
- A race-condition unique-name collision is recognised heuristically (`/unique|constraint/i` on the thrown message) and surfaces as `Result.err(new Error(\`A category named "..." already exists.\`))`; callers in `build-expenses.tsx` map that error straight back to the `category` field via `redirectWithFormErrors`.
- Note: kept around as the simpler category-only helper from Issue 05. Issue 06's combined-creation flow uses the more general `createManyAndExpense` below; this helper is currently unused by the route handlers but remains a useful reference.

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

## Recurring template helpers

### `RecurringRow`

```ts
interface RecurringRow {
  id: string
  description: string
  amountCents: number
  categoryId: string
  categoryName: string
  recurrence: string
  anchorDate: string
  tagIds: string[]
  tagNames: string[]
}
```

### `listRecurring(db): Promise<Result<RecurringRow[], Error>>`

Lists all recurring templates sorted by description ascending (case-insensitive). Each row includes the joined category name and alphabetized tag names/ids.

### `getRecurringById(db, id): Promise<Result<RecurringRow | null, Error>>`

Looks up a single recurring template by id. Returns `Result.ok(null)` for unknown ids.

### `createRecurringWithTags(db, input): Promise<Result<{ id }, Error>>`

Creates a recurring template row plus its `recurringTag` links in a single batch. Duplicate tag ids are silently de-duplicated.

### `createManyAndRecurring(db, input): Promise<Result<{ categoryId, recurringId, createdTagIds }, Error>>`

Atomically creates zero-or-one new category, zero-or-more new tags, the recurring template row, and the `recurringTag` links — all in a single D1 batch. Names are lower-cased after trim. Exactly one of `newCategoryName` / `existingCategoryId` must be supplied.

### `updateRecurringWithTags(db, input): Promise<Result<{ id }, Error>>`

Updates an existing recurring template's mutable fields and replaces its `recurringTag` link set. Does NOT modify any `expense` rows previously generated from this template.

### `updateManyAndRecurring(db, input): Promise<Result<{ id, categoryId, createdTagIds }, Error>>`

Atomically creates zero-or-one new category, zero-or-more new tags, updates the existing recurring template row, and replaces its `recurringTag` link set — all in a single D1 batch. Does NOT modify generated expense rows.

### `deleteRecurring(db, id): Promise<Result<void, Error>>`

Deletes a recurring template by id. `ON DELETE CASCADE` on `recurringTag` cleans up tag links. `ON DELETE SET NULL` on `expense.recurringId` nullifies the provenance link on past generated expense rows without deleting them.

## Materialization helpers (Issue 14)

### `MaterializeRecurringResult`

```ts
interface MaterializeRecurringResult {
  generated: number
  skipped: number
  failed: Array<{ recurringId: string; error: string }>
}
```

### `materializeRecurring(db, today): Promise<Result<MaterializeRecurringResult, Error>>`

Materializes all pending recurring expense rows across every active template. Loads all templates with `withRetry`, then for each template calls `materializeOneRecurring`. Per-template errors are collected into `failed` rather than propagated. Each occurrence is inserted as an `expense` row with `recurringId` and `occurrenceDate` set, plus corresponding `expenseTag` links. Unique-index violations on `(recurringId, occurrenceDate)` are treated as no-ops (counted as `skipped`).

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`
- [db/schema.md](../../db/schema.md) — `expense`, `category`, `tag`, `expenseTag` tables.
- [category-access.md](./category-access.md) — category operations (moved from this file)
- [tag-access.md](./tag-access.md) — tag operations (moved from this file)
- [summary-access.md](./summary-access.md) — summary operations (moved from this file, then deleted 2026-05-22)
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — primary caller for the list + create flow.
- [routes/expenses/build-edit-expense.md](../routes/expenses/build-edit-expense.md) — edit + delete flow caller (Issue 08): `getExpenseById`, `updateExpenseWithTags`, `updateManyAndExpense`, `deleteExpense`.
- [routes/build-categories.md](../../routes/build-categories.md) — category management caller (Issue 09).
- [routes/build-tags.md](../../routes/build-tags.md) — tag management caller (Issue 10).
- [routes/build-summary.md](../routes/build-summary.md) — summary page placeholder (full implementation removed 2026-05-22).
- [routes/test/database.md](../routes/test/database.md) — `POST /test/database/seed-expenses` and `POST /test/database/seed-categories` populate rows for tests.

---

See [source-code.md](../../../source-code.md) for the full catalog.
