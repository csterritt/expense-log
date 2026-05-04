# expense-access.spec.ts

**Source:** `tests/expense-access.spec.ts`

## Purpose

Unit-level coverage for selected helpers in [`src/lib/db/expense-access.ts`](../src/lib/db/expense-access.md). Issue 09 adds a lightweight Bun SQLite harness so category repository helpers can be tested without relying only on Playwright.

## Setup

- Uses `bun:test`, `node:assert`, Drizzle's Bun SQLite driver, and an in-memory SQLite database.
- Creates minimal `category`, `recurring`, and `expense` tables with the same foreign-key and `lower(name)` unique-index semantics that the category-management helpers rely on.
- Adds a local `db.batch` shim backed by a SQLite transaction so `mergeCategory` can exercise the same atomic-batch shape used in D1.

## Test cases

- Keeps the historical placeholder assertion noting that older DB helpers are covered by Playwright.
- `createCategory stores lowercase names and rejects case-insensitive duplicates` — verifies trimming/lowercasing and duplicate error text.
- `renameCategory updates the category name and timestamp` — verifies normalized rename output and persisted row update.
- `renameCategory detects case-insensitive collisions before merge` — proves a target collision can be found before routing to merge confirmation and that the repository blocks direct duplicate renames.
- `mergeCategory repoints source expenses and removes the source category` — verifies every source expense moves to the target, unrelated expenses remain unchanged, and the source category is deleted.
- `deleteCategory fails with the exact referencing expense count when referenced` — verifies referenced categories are not deleted and the error includes the count.
- `deleteCategory succeeds for an unreferenced category` — verifies deletion leaves referenced sibling categories/expenses intact.
- `deleteCategory blocks categories referenced by recurring templates` — verifies recurring templates also preserve category referential integrity.

## Cross-references

- [../src/lib/db/expense-access.md](../src/lib/db/expense-access.md) — helpers under test.
- [../src/db/schema.md](../src/db/schema.md) — schema constraints mirrored by the in-memory harness.
- [expense-validators.spec.md](expense-validators.spec.md) — companion unit coverage for category-management validators.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
