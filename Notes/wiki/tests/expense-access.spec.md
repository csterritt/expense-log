# expense-access.spec.ts

**Source:** `tests/expense-access.spec.ts`

## Purpose

Unit-level coverage for selected helpers in [`src/lib/db/expense-access.ts`](../src/lib/db/expense-access.md). Issue 09 adds a lightweight Bun SQLite harness for category repository helpers; Issue 10 extends that harness with tag-specific tables and tests for `createTag`, `renameTag`, `mergeTag`, and `deleteTag`. (Issue 12 `summarize` tests, formerly in this file, were removed 2026-05-22 when `summary-access.ts` was deleted.)

## Setup

- Uses `bun:test`, `node:assert`, Drizzle's Bun SQLite driver, and an in-memory SQLite database.
- Creates minimal `category`, `recurring`, `expense`, `tag`, `expenseTag`, and `recurringTag` tables with the same foreign-key and `lower(name)` unique-index semantics that the management helpers rely on.
- Adds a local `db.batch` shim backed by a SQLite transaction so `mergeCategory` and `mergeTag` can exercise the same atomic-batch shape used in D1.
- Helper functions: `seedCategory`, `seedExpense`, `seedTag`, `seedExpenseTag`.

## Test cases

### Historical placeholder

- `DB-level assertions are covered by Playwright e2e specs` — intentionally empty assertion kept from the original stub.

### Category repository helpers (Issue 09)

- `createCategory stores lowercase names and rejects case-insensitive duplicates` — verifies trimming/lowercasing and duplicate error text.
- `renameCategory updates the category name and timestamp` — verifies normalized rename output and persisted row update.
- `renameCategory detects case-insensitive collisions before merge` — proves a target collision can be found before routing to merge confirmation and that the repository blocks direct duplicate renames.
- `mergeCategory repoints source expenses and removes the source category` — verifies every source expense moves to the target, unrelated expenses remain unchanged, and the source category is deleted.
- `deleteCategory fails with the exact referencing expense count when referenced` — verifies referenced categories are not deleted and the error includes the count.
- `deleteCategory succeeds for an unreferenced category` — verifies deletion leaves referenced sibling categories/expenses intact.
- `deleteCategory blocks categories referenced by recurring templates` — verifies recurring templates also preserve category referential integrity.

### Tag repository helpers (Issue 10)

- `createTag stores lowercase names and rejects case-insensitive duplicates` — verifies trimming/lowercasing; asserts only one tag row after duplicate attempt.
- `renameTag updates the tag name and timestamp` — verifies normalized rename output and persisted row update.
- `renameTag detects case-insensitive collision before merge` — proves a target collision can be found before routing to merge confirmation and that the repository blocks direct duplicate renames.
- `mergeTag repoints all expenseTag rows from source to target and removes source tag` — seeds three tags and three expenses (two linked to source, one to an unrelated tag); verifies source expenses now point at target, `other` tag link is unchanged, no duplicate `(expenseId, tagId)` rows exist, and source tag is deleted.
- `mergeTag deduplicates expenseTag rows when an expense already has both source and target` — seeds an expense with both source and target tags; after merge, only the target link remains; total row count is 2 (not 3).
- `deleteTag fails with the exact referencing expense count when referenced` — verifies referenced tags are not deleted and the error includes the exact count.
- `deleteTag succeeds for an unreferenced tag` — verifies deletion leaves referenced sibling tags/expenses intact.

## Cross-references

- [../src/lib/db/expense-access.md](../src/lib/db/expense-access.md) — helpers under test.
- [../src/db/schema.md](../src/db/schema.md) — schema constraints mirrored by the in-memory harness.
- [expense-validators.spec.md](expense-validators.spec.md) — companion unit coverage for category and tag management validators.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
