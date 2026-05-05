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

import { category, expense, expenseTag, recurring, tag, schema } from '../src/db/schema'
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  findCategoryByName,
  mergeCategory,
  mergeTag,
  renameCategory,
  renameTag,
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
  sqlite.run(
    'CREATE TABLE tag (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run('CREATE UNIQUE INDEX tag_name_lower_unique ON tag (lower(name))')
  sqlite.run(
    'CREATE TABLE expenseTag (expenseId TEXT NOT NULL REFERENCES expense(id) ON DELETE CASCADE, tagId TEXT NOT NULL REFERENCES tag(id) ON DELETE RESTRICT, PRIMARY KEY (expenseId, tagId))',
  )
  sqlite.run(
    'CREATE TABLE recurringTag (recurringId TEXT NOT NULL REFERENCES recurring(id) ON DELETE CASCADE, tagId TEXT NOT NULL REFERENCES tag(id) ON DELETE RESTRICT, PRIMARY KEY (recurringId, tagId))',
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

const seedTag = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(tag).values({ id, name, createdAt: now, updatedAt: now })
}

const seedExpenseTag = async (
  db: TestDb,
  expenseId: string,
  tagId: string,
): Promise<void> => {
  await db.insert(expenseTag).values({ expenseId, tagId })
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

describe('tag repository helpers', () => {
  it('createTag stores lowercase names and rejects case-insensitive duplicates', async () => {
    const db = await createTestDb()
    const created = await createTag(db, '  Travel  ')
    assert.strictEqual(created.isOk, true)
    if (created.isOk) {
      assert.strictEqual(created.value.name, 'travel')
    }

    const duplicate = await createTag(db, 'TRAVEL')
    assert.strictEqual(duplicate.isErr, true)
    if (duplicate.isErr) {
      assert.match(duplicate.error.message, /already exists/)
    }

    const rows = await db.select({ name: tag.name }).from(tag)
    assert.strictEqual(rows.length, 1)
    assert.strictEqual(rows[0]?.name, 'travel')
  })

  it('renameTag updates the tag name and timestamp', async () => {
    const db = await createTestDb()
    await seedTag(db, 'tag-1', 'travel')
    const before = await db
      .select({ updatedAt: tag.updatedAt })
      .from(tag)
      .where(eq(tag.id, 'tag-1'))
      .limit(1)

    const result = await renameTag(db, { id: 'tag-1', name: '  Trips  ' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, { id: 'tag-1', name: 'trips' })
    }

    const after = await db
      .select({ name: tag.name, updatedAt: tag.updatedAt })
      .from(tag)
      .where(eq(tag.id, 'tag-1'))
      .limit(1)
    assert.strictEqual(after[0]?.name, 'trips')
    assert.ok(Number(after[0]?.updatedAt) >= Number(before[0]?.updatedAt))
  })

  it('renameTag detects case-insensitive collision before merge', async () => {
    const db = await createTestDb()
    await seedTag(db, 'tag-1', 'travel')
    await seedTag(db, 'tag-2', 'trips')

    const duplicate = await db
      .select({ id: tag.id })
      .from(tag)
      .where(and(sql`lower(${tag.name}) = lower(${'TRIPS'})`, ne(tag.id, 'tag-1')))
      .limit(1)
    assert.strictEqual(duplicate[0]?.id, 'tag-2')

    const result = await renameTag(db, { id: 'tag-1', name: 'TRIPS' })
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /already exists/)
    }
  })

  it('mergeTag repoints all expenseTag rows from source to target and removes source tag', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'source', 'travel')
    await seedTag(db, 'target', 'trips')
    await seedTag(db, 'other', 'dining')
    await seedExpense(db, 'exp-1', 'cat-1')
    await seedExpense(db, 'exp-2', 'cat-1')
    await seedExpense(db, 'exp-3', 'cat-1')
    await seedExpenseTag(db, 'exp-1', 'source')
    await seedExpenseTag(db, 'exp-2', 'source')
    await seedExpenseTag(db, 'exp-3', 'other')

    const result = await mergeTag(db, { sourceId: 'source', targetId: 'target' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, { reassignedExpenseCount: 2 })
    }

    const expTagRows = await db
      .select({ expenseId: expenseTag.expenseId, tagId: expenseTag.tagId })
      .from(expenseTag)
    const tagIds = expTagRows.map((r) => r.tagId).sort()
    assert.deepStrictEqual(tagIds, ['other', 'target', 'target'])

    const tags = await db.select({ id: tag.id }).from(tag)
    assert.deepStrictEqual(tags.map((r) => r.id).sort(), ['other', 'target'])

    const expTagDupes = await db
      .select({ expenseId: expenseTag.expenseId, tagId: expenseTag.tagId })
      .from(expenseTag)
      .where(eq(expenseTag.tagId, 'target'))
    const expenseIds = expTagDupes.map((r) => r.expenseId)
    assert.strictEqual(expenseIds.length, new Set(expenseIds).size)
  })

  it('mergeTag deduplicates expenseTag rows when an expense already has both source and target', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'source', 'travel')
    await seedTag(db, 'target', 'trips')
    await seedExpense(db, 'exp-1', 'cat-1')
    await seedExpense(db, 'exp-2', 'cat-1')
    await seedExpenseTag(db, 'exp-1', 'source')
    await seedExpenseTag(db, 'exp-1', 'target')
    await seedExpenseTag(db, 'exp-2', 'source')

    const result = await mergeTag(db, { sourceId: 'source', targetId: 'target' })
    assert.strictEqual(result.isOk, true)

    const expTagRows = await db
      .select({ expenseId: expenseTag.expenseId, tagId: expenseTag.tagId })
      .from(expenseTag)
    assert.strictEqual(expTagRows.length, 2)
    const pairs = expTagRows.map((r) => `${r.expenseId}:${r.tagId}`).sort()
    assert.deepStrictEqual(pairs, ['exp-1:target', 'exp-2:target'])

    const tags = await db.select({ id: tag.id }).from(tag)
    assert.deepStrictEqual(tags.map((r) => r.id).sort(), ['target'])
  })

  it('deleteTag fails with the exact referencing expense count when referenced', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-1', 'travel')
    await seedExpense(db, 'exp-1', 'cat-1')
    await seedExpense(db, 'exp-2', 'cat-1')
    await seedExpenseTag(db, 'exp-1', 'tag-1')
    await seedExpenseTag(db, 'exp-2', 'tag-1')

    const result = await deleteTag(db, 'tag-1')
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /2 expenses reference/)
    }

    const tags = await db.select({ id: tag.id }).from(tag)
    assert.deepStrictEqual(
      tags.map((r) => r.id),
      ['tag-1'],
    )
  })

  it('deleteTag succeeds for an unreferenced tag', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-1', 'travel')
    await seedTag(db, 'tag-2', 'dining')
    await seedExpense(db, 'exp-1', 'cat-1')
    await seedExpenseTag(db, 'exp-1', 'tag-2')

    const result = await deleteTag(db, 'tag-1')
    assert.strictEqual(result.isOk, true)

    const tags = await db.select({ id: tag.id }).from(tag)
    assert.deepStrictEqual(
      tags.map((r) => r.id),
      ['tag-2'],
    )
  })
})
