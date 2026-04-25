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

## Exports

### `listExpenses(db, filters): Promise<Result<ExpenseRow[], Error>>`

- Public wrapper: calls `withRetry('listExpenses', () => listExpensesActual(db, filters))`.
- Private `listExpensesActual` joins `expense` -> `category` to fetch the category name, filters by `expense.date BETWEEN filters.from AND filters.to` (inclusive), and sorts by `date DESC`, then `lower(description) ASC` for the case-insensitive tiebreak.
- Hydrates `tagNames` via a single secondary query that joins `expenseTag` -> `tag`, grouped by `expenseId` in a `Map`.

### `listCategories(db): Promise<Result<CategoryRow[], Error>>`

- Public wrapper: `withRetry('listCategories', () => listCategoriesActual(db))`.
- Returns `{ id, name }` rows from `category`, sorted case-insensitively by `lower(name) ASC` (consistent with the list-view tiebreak convention).
- Used by the entry form on `/expenses` to populate the category `<select>`.

### `createExpense(db, input): Promise<Result<{ id: string }, Error>>`

- Public wrapper: `withRetry('createExpense', () => createExpenseActual(db, input))`.
- Verifies that `input.categoryId` exists in the `category` table; returns `Result.err` with a "Category not found" message otherwise.
- Generates a new `id` via `crypto.randomUUID()` and inserts a row into `expense` with `createdAt`/`updatedAt` set to the current `Date`. No tag handling in this slice (tags arrive in a later issue).
- Inputs are assumed already validated by the caller (the POST handler in `build-expenses.tsx` does this via `parseAmount`, `isValidYmd`, and a description length check).

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`
- [db/schema.md](../../db/schema.md) — `expense`, `category`, `tag`, `expenseTag` tables.
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — primary caller (GET renders the list + form, POST calls `createExpense`).
- [routes/test/database.md](../routes/test/database.md) — `POST /test/database/seed-expenses` and `POST /test/database/seed-categories` populate rows for tests.

---

See [source-code.md](../../../source-code.md) for the full catalog.
