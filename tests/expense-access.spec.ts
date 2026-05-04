// ====================================
// Tests for src/lib/db/expense-access.ts
//
// Note on `listTags` (and the other DB helpers in this file):
// Issue 05 task 3 and Issue 06 deferred unit-level DB assertions to the
// Playwright e2e suite because no in-memory D1 / SQLite test harness was
// established in `tests/`. Issue 07 task 2 mirrors that decision: the
// behavior of `listTags` is verified end-to-end via the entry-form's
// embedded `tags-data` payload and the tag-chip-picker e2e spec
// (`e2e-tests/expenses/07-tag-chip-picker-js.spec.ts`).
//
// Issue 08 (edit + delete expense) adds `getExpenseById`,
// `updateExpenseWithTags`, `updateManyAndExpense`, and `deleteExpense` and
// mirrors the same decision: their behavior is verified via the Issue 08
// Playwright specs (`e2e-tests/expenses/09-edit-expense.spec.ts`,
// `10-edit-with-new-items.spec.ts`, `11-delete-expense.spec.ts`).
//
// To run: cd to the project root and run `bun test`.
// ====================================

import { describe, it } from 'bun:test'
import { and, eq, ne, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import assert from 'node:assert'

import { category, expense, recurring, schema } from '../src/db/schema'
import {
  createCategory,
  deleteCategory,
  findCategoryByName,
  mergeCategory,
  renameCategory,
} from '../src/lib/db/expense-access'
import type { DrizzleClient } from '../src/local-types'

type RunnableQuery = {
  run: () => unknown
}

type TestDb = DrizzleClient

const createTestDb = async (): Promise<TestDb> => {
  const bunSqlite = (await eval("import('bun:sqlite')")) as {
    Database: new (path: string) => {
      run: (sql: string) => unknown
      transaction: <T>(fn: () => T) => () => T
    }
  }
  const { Database } = bunSqlite
  const sqlite = new Database(':memory:')
  sqlite.run('PRAGMA foreign_keys = ON')
  sqlite.run(
    'CREATE TABLE category (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run('CREATE UNIQUE INDEX category_name_lower_unique ON category (lower(name))')
  sqlite.run(
    'CREATE TABLE recurring (id TEXT PRIMARY KEY, description TEXT NOT NULL, amountCents INTEGER NOT NULL, categoryId TEXT NOT NULL REFERENCES category(id) ON DELETE RESTRICT, recurrence TEXT NOT NULL, anchorDate TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run(
    'CREATE TABLE expense (id TEXT PRIMARY KEY, description TEXT NOT NULL, amountCents INTEGER NOT NULL, categoryId TEXT NOT NULL REFERENCES category(id) ON DELETE RESTRICT, date TEXT NOT NULL, recurringId TEXT REFERENCES recurring(id) ON DELETE SET NULL, occurrenceDate TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  const db = drizzle(sqlite, { schema })
  return Object.assign(db, {
    batch: async (queries: readonly RunnableQuery[]): Promise<unknown[]> => {
      const runBatch = sqlite.transaction(() => queries.map((query) => query.run()))
      return runBatch()
    },
  }) as unknown as TestDb
}

const seedCategory = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(category).values({ id, name, createdAt: now, updatedAt: now })
}

const seedExpense = async (db: TestDb, id: string, categoryId: string): Promise<void> => {
  const now = new Date()
  await db.insert(expense).values({
    id,
    description: id,
    amountCents: 100,
    categoryId,
    date: '2024-01-01',
    createdAt: now,
    updatedAt: now,
  })
}

const expenseCategoryIds = async (db: TestDb): Promise<string[]> => {
  const rows = await db.select({ categoryId: expense.categoryId }).from(expense)
  return rows.map((row) => row.categoryId).sort()
}

describe('expense-access DB helpers', () => {
  it('DB-level assertions are covered by Playwright e2e specs', () => {
    // intentionally empty — see header comment above
  })
})

describe('category repository helpers', () => {
  it('createCategory stores lowercase names and rejects case-insensitive duplicates', async () => {
    const db = await createTestDb()
    const created = await createCategory(db, '  Food  ')
    assert.strictEqual(created.isOk, true)
    if (created.isOk) {
      assert.strictEqual(created.value.name, 'food')
    }

    const duplicate = await createCategory(db, 'FOOD')
    assert.strictEqual(duplicate.isErr, true)
    if (duplicate.isErr) {
      assert.match(duplicate.error.message, /already exists/)
    }

    const found = await findCategoryByName(db, 'food')
    assert.strictEqual(found.isOk, true)
    if (found.isOk) {
      assert.strictEqual(found.value?.name, 'food')
    }
  })

  it('renameCategory updates the category name and timestamp', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    const before = await db
      .select({ updatedAt: category.updatedAt })
      .from(category)
      .where(eq(category.id, 'cat-1'))
      .limit(1)

    const result = await renameCategory(db, { id: 'cat-1', name: '  Utilities  ' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, { id: 'cat-1', name: 'utilities' })
    }

    const after = await db
      .select({ name: category.name, updatedAt: category.updatedAt })
      .from(category)
      .where(eq(category.id, 'cat-1'))
      .limit(1)
    assert.strictEqual(after[0]?.name, 'utilities')
    assert.ok(Number(after[0]?.updatedAt) >= Number(before[0]?.updatedAt))
  })

  it('renameCategory detects case-insensitive collisions before merge', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedCategory(db, 'cat-2', 'groceries')

    const duplicate = await db
      .select({ id: category.id })
      .from(category)
      .where(and(sql`lower(${category.name}) = lower(${'GROCERIES'})`, ne(category.id, 'cat-1')))
      .limit(1)
    assert.strictEqual(duplicate[0]?.id, 'cat-2')

    const result = await renameCategory(db, { id: 'cat-1', name: 'GROCERIES' })
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /already exists/)
    }
  })

  it('mergeCategory repoints source expenses and removes the source category', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'source', 'food')
    await seedCategory(db, 'target', 'groceries')
    await seedCategory(db, 'other', 'utilities')
    await seedExpense(db, 'expense-1', 'source')
    await seedExpense(db, 'expense-2', 'source')
    await seedExpense(db, 'expense-3', 'other')

    const result = await mergeCategory(db, { sourceId: 'source', targetId: 'target' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, { reassignedExpenseCount: 2 })
    }

    assert.deepStrictEqual(await expenseCategoryIds(db), ['other', 'target', 'target'])
    const categories = await db.select({ id: category.id }).from(category)
    assert.deepStrictEqual(categories.map((row) => row.id).sort(), ['other', 'target'])
  })

  it('deleteCategory fails with the exact referencing expense count when referenced', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpense(db, 'expense-1', 'cat-1')
    await seedExpense(db, 'expense-2', 'cat-1')

    const result = await deleteCategory(db, 'cat-1')
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /2 expenses reference/)
    }

    const categories = await db.select({ id: category.id }).from(category)
    assert.deepStrictEqual(
      categories.map((row) => row.id),
      ['cat-1'],
    )
  })

  it('deleteCategory succeeds for an unreferenced category', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedCategory(db, 'cat-2', 'utilities')
    await seedExpense(db, 'expense-1', 'cat-2')

    const result = await deleteCategory(db, 'cat-1')
    assert.strictEqual(result.isOk, true)

    const categories = await db.select({ id: category.id }).from(category)
    assert.deepStrictEqual(
      categories.map((row) => row.id),
      ['cat-2'],
    )
    assert.deepStrictEqual(await expenseCategoryIds(db), ['cat-2'])
  })

  it('deleteCategory blocks categories referenced by recurring templates', async () => {
    const db = await createTestDb()
    const now = new Date()
    await seedCategory(db, 'cat-1', 'food')
    await db.insert(recurring).values({
      id: 'recurring-1',
      description: 'Rent',
      amountCents: 100,
      categoryId: 'cat-1',
      recurrence: 'monthly',
      anchorDate: '2024-01-01',
      createdAt: now,
      updatedAt: now,
    })

    const result = await deleteCategory(db, 'cat-1')
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /Recurring expenses reference/)
    }
  })
})
