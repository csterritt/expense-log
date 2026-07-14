# helpers/test-db.ts

**Source:** `tests/helpers/test-db.ts`

## Purpose

Shared in-memory test database setup for unit tests. Consolidates the duplicated `createTestDb` pattern from multiple test files into a single reusable module.

## Exports

### `createTestDb(): Promise<TestDb>`

Creates an in-memory Bun SQLite database with `PRAGMA foreign_keys = ON` and manually creates the following tables with the same schema constraints as production:

- `category` — with `category_name_lower_unique` index on `lower(name)`.
- `recurring` — with FK to `category(id)` `ON DELETE RESTRICT`.
- `expense` — with FK to `category(id)` `ON DELETE RESTRICT`, FK to `recurring(id)` `ON DELETE SET NULL`, and `expense_recurring_occurrence_unique` partial unique index.
- `tag` — with `tag_name_lower_unique` index on `lower(name)`.
- `expenseTag` — junction table with composite PK `(expenseId, tagId)`.
- `recurringTag` — junction table with composite PK `(recurringId, tagId)`.

Returns a Drizzle client with a `batch` shim backed by a SQLite transaction, so `mergeCategory` and `mergeTag` can exercise the same atomic-batch shape used in D1.

### `TestDb` type

Alias for `DrizzleClient`.

### Seed helpers

- `seedCategory(db, id, name)` — inserts a category row with current timestamp.
- `seedTag(db, id, name)` — inserts a tag row with current timestamp.
- `seedExpense(db, id, categoryId, date?, amountCents?, recurringId?, occurrenceDate?)` — inserts an expense row with defaults `date='2024-01-01'`, `amountCents=100`, `recurringId=null`, `occurrenceDate=null`.
- `seedExpenseTag(db, expenseId, tagId)` — inserts an expense-tag link.
- `seedRecurring(db, id, categoryId, tagIds?)` — inserts a recurring template with defaults `description='Monthly rent'`, `amountCents=150000`, `recurrence='monthly'`, `anchorDate='2026-01-01'`, and optional `recurringTag` links.

## Dependencies

- `drizzle-orm/bun-sqlite` — Drizzle ORM Bun SQLite driver.
- `../../src/db/schema` — schema definitions.
- `../../src/local-types` — `DrizzleClient` type.

## Cross-references

- [../../src/db/schema.md](../../src/db/schema.md) — schema definitions mirrored by the in-memory harness.
- [../expense-access.spec.md](../expense-access.spec.md) — primary consumer.
- [../expense-confirm-handler.spec.md](../expense-confirm-handler.spec.md) — consumer.
- [../summary-access.spec.md](../summary-access.spec.md) — consumer.
- [../recurring-confirm-handler.spec.md](../recurring-confirm-handler.spec.md) — consumer.
- [../recurring-edit-confirm-handler.spec.md](../recurring-edit-confirm-handler.spec.md) — consumer.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
