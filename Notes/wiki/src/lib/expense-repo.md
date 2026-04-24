# expense-repo.ts

**Source:** `src/lib/expense-repo.ts`

## Purpose

Read/write helpers for the `expense` table and its joins to `category`, `tag`, and `expenseTag`. Issue 02 introduced `listExpenses` for the date-filtered list view.

## Exports

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

The type may be broadened by future issues (search, category filter, etc.); only the date range is implemented now.

### `listExpenses(c, filters): Promise<ExpenseRow[]>`

- Joins `expense` → `category` to fetch the category name.
- Filters by `expense.date BETWEEN filters.from AND filters.to` (inclusive).
- Sorts by `date DESC`, then `lower(description) ASC` for the case-insensitive tiebreak.
- Hydrates `tagNames` via a single secondary query that joins `expenseTag` → `tag`, grouped by `expenseId` in a `Map`.

Receives a Hono `Context` and constructs a Drizzle client via `createDbClient(c.env.PROJECT_DB)`.

## Cross-references

- [src/db/schema.md](../db/schema.md) — `expense`, `category`, `tag`, `expenseTag` tables.
- [src/lib/db-access.md](db-access.md) — Drizzle pattern reference (this module deliberately bypasses the retry wrapper for read-only list queries).
- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — primary caller.
- [routes/test/database.md](../routes/test/database.md) — `POST /test/database/seed-expenses` populates rows for tests.

---

See [source-code.md](../../source-code.md) for the full catalog.
