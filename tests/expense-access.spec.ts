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
import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import assert from 'node:assert'
import { Result } from 'true-myth'

import { category, expense, expenseTag, recurring, recurringTag, tag, schema } from '../src/db/schema'
import {
  listExpenses,
  listRecurring,
  getRecurringById,
  createRecurringWithTags,
  createManyAndRecurring,
  updateRecurringWithTags,
  updateManyAndRecurring,
  deleteRecurring,
  materializeRecurring,
} from '../src/lib/db/expense-access'
import {
  createCategory,
  deleteCategory,
  findCategoryByName,
  mergeCategory,
  renameCategory,
} from '../src/lib/db/category-access'
import {
  createTag,
  deleteTag,
  mergeTag,
  renameTag,
} from '../src/lib/db/tag-access'
import { summarize } from '../src/lib/db/summary-access'
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
    'CREATE UNIQUE INDEX expense_recurring_occurrence_unique ON expense (recurringId, occurrenceDate) WHERE recurringId IS NOT NULL',
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

// ====================================
// listExpenses filter tests (Issue 11)
// ====================================

const seedExpenseFull = async (
  db: TestDb,
  id: string,
  categoryId: string,
  date: string,
  description: string,
  amountCents = 100,
): Promise<void> => {
  const now = new Date()
  await db.insert(expense).values({
    id,
    description,
    amountCents,
    categoryId,
    date,
    createdAt: now,
    updatedAt: now,
  })
}

describe('listExpenses filters (Issue 11)', () => {
  it('returns all expenses when no filters are set', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-03-01', 'Apple')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-02-01', 'Banana')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id).sort()
      assert.deepStrictEqual(ids, ['e1', 'e2'])
    }
  })

  it('filters by from date (open-to)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-03-15', 'March')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-10', 'January')

    const result = await listExpenses(db, { from: '2024-03-01' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e1'])
    }
  })

  it('filters by to date (open-from)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-03-15', 'March')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-10', 'January')

    const result = await listExpenses(db, { to: '2024-02-01' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e2'])
    }
  })

  it('filters by both from and to dates', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-03-15', 'March')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-10', 'January')
    await seedExpenseFull(db, 'e3', 'cat-1', '2024-02-20', 'February')

    const result = await listExpenses(db, { from: '2024-02-01', to: '2024-03-10' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e3'])
    }
  })

  it('returns all when both from and to are absent', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2020-01-01', 'Old')
    await seedExpenseFull(db, 'e2', 'cat-1', '2025-12-31', 'Future')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id).sort()
      assert.deepStrictEqual(ids, ['e1', 'e2'])
    }
  })

  it('filters description case-insensitively (substring match)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-01', 'Grocery Store')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-02', 'GROCERY ONLINE')
    await seedExpenseFull(db, 'e3', 'cat-1', '2024-01-03', 'Gas Station')

    const result = await listExpenses(db, { description: 'grocery' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id).sort()
      assert.deepStrictEqual(ids, ['e1', 'e2'])
    }
  })

  it('treats empty/whitespace-only description as no filter', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-01', 'Alpha')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-02', 'Beta')

    const result = await listExpenses(db, { description: '   ' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id).sort()
      assert.deepStrictEqual(ids, ['e1', 'e2'])
    }
  })

  it('filters by categoryId', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-food', 'food')
    await seedCategory(db, 'cat-utils', 'utilities')
    await seedExpenseFull(db, 'e1', 'cat-food', '2024-01-01', 'Lunch')
    await seedExpenseFull(db, 'e2', 'cat-utils', '2024-01-01', 'Electric')

    const result = await listExpenses(db, { categoryId: 'cat-food' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e1'])
    }
  })

  it('tagMode or returns expenses with any of the listed tags', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-alpha', 'alpha')
    await seedTag(db, 'tag-beta', 'beta')
    await seedExpenseFull(db, 'e-none', 'cat-1', '2024-01-01', 'no tags')
    await seedExpenseFull(db, 'e-alpha', 'cat-1', '2024-01-02', 'only alpha')
    await seedExpenseFull(db, 'e-beta', 'cat-1', '2024-01-03', 'only beta')
    await seedExpenseFull(db, 'e-both', 'cat-1', '2024-01-04', 'both tags')
    await seedExpenseTag(db, 'e-alpha', 'tag-alpha')
    await seedExpenseTag(db, 'e-beta', 'tag-beta')
    await seedExpenseTag(db, 'e-both', 'tag-alpha')
    await seedExpenseTag(db, 'e-both', 'tag-beta')

    const result = await listExpenses(db, {
      tagIds: ['tag-alpha', 'tag-beta'],
      tagMode: 'or',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id).sort()
      assert.deepStrictEqual(ids, ['e-alpha', 'e-beta', 'e-both'])
    }
  })

  it('tagMode and returns only expenses with all listed tags', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-alpha', 'alpha')
    await seedTag(db, 'tag-beta', 'beta')
    await seedExpenseFull(db, 'e-none', 'cat-1', '2024-01-01', 'no tags')
    await seedExpenseFull(db, 'e-alpha', 'cat-1', '2024-01-02', 'only alpha')
    await seedExpenseFull(db, 'e-beta', 'cat-1', '2024-01-03', 'only beta')
    await seedExpenseFull(db, 'e-both', 'cat-1', '2024-01-04', 'both tags')
    await seedExpenseTag(db, 'e-alpha', 'tag-alpha')
    await seedExpenseTag(db, 'e-beta', 'tag-beta')
    await seedExpenseTag(db, 'e-both', 'tag-alpha')
    await seedExpenseTag(db, 'e-both', 'tag-beta')

    const result = await listExpenses(db, {
      tagIds: ['tag-alpha', 'tag-beta'],
      tagMode: 'and',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e-both'])
    }
  })

  it('tagMode and is meaningfully different from or', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-alpha', 'alpha')
    await seedTag(db, 'tag-beta', 'beta')
    await seedExpenseFull(db, 'e-alpha', 'cat-1', '2024-01-02', 'only alpha')
    await seedExpenseFull(db, 'e-beta', 'cat-1', '2024-01-03', 'only beta')
    await seedExpenseFull(db, 'e-both', 'cat-1', '2024-01-04', 'both tags')
    await seedExpenseTag(db, 'e-alpha', 'tag-alpha')
    await seedExpenseTag(db, 'e-beta', 'tag-beta')
    await seedExpenseTag(db, 'e-both', 'tag-alpha')
    await seedExpenseTag(db, 'e-both', 'tag-beta')

    const orResult = await listExpenses(db, {
      tagIds: ['tag-alpha', 'tag-beta'],
      tagMode: 'or',
    })
    const andResult = await listExpenses(db, {
      tagIds: ['tag-alpha', 'tag-beta'],
      tagMode: 'and',
    })
    assert.strictEqual(orResult.isOk, true)
    assert.strictEqual(andResult.isOk, true)
    if (orResult.isOk && andResult.isOk) {
      assert.strictEqual(orResult.value.length, 3)
      assert.strictEqual(andResult.value.length, 1)
    }
  })

  it('combines filters with AND across fields', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-food', 'food')
    await seedCategory(db, 'cat-utils', 'utilities')
    await seedTag(db, 'tag-alpha', 'alpha')
    await seedExpenseFull(db, 'e1', 'cat-food', '2024-03-01', 'Lunch grocery')
    await seedExpenseFull(db, 'e2', 'cat-food', '2024-01-01', 'Lunch old')
    await seedExpenseFull(db, 'e3', 'cat-utils', '2024-03-01', 'Lunch utilities')
    await seedExpenseFull(db, 'e4', 'cat-food', '2024-03-01', 'Dinner grocery')
    await seedExpenseTag(db, 'e1', 'tag-alpha')
    await seedExpenseTag(db, 'e4', 'tag-alpha')

    const result = await listExpenses(db, {
      from: '2024-02-01',
      description: 'lunch',
      categoryId: 'cat-food',
      tagIds: ['tag-alpha'],
      tagMode: 'or',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e1'])
    }
  })

  it('result ordering is date desc then case-insensitive description asc', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-03-01', 'Beta')
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-03-01', 'alpha')
    await seedExpenseFull(db, 'e3', 'cat-1', '2024-02-01', 'Gamma')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['e2', 'e1', 'e3'])
    }
  })

  it('tag names are returned alphabetically sorted per row', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-z', 'zzz')
    await seedTag(db, 'tag-a', 'aaa')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-01', 'Lunch')
    await seedExpenseTag(db, 'e1', 'tag-z')
    await seedExpenseTag(db, 'e1', 'tag-a')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value[0]?.tagNames, ['aaa', 'zzz'])
    }
  })
})

// ====================================
// summarize tests (Issue 14)
// ====================================

describe('summarize (Issue 14)', () => {
  it('groups by month with correct totals and counts', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-w', 'work')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-20', 'Dinner', 2000)
    await seedExpenseFull(db, 'e3', 'cat-1', '2024-02-05', 'Breakfast', 500)
    await seedExpenseTag(db, 'e1', 'tag-w')
    await seedExpenseTag(db, 'e2', 'tag-w')
    await seedExpenseTag(db, 'e3', 'tag-w')

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-02-28',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2)
      assert.deepStrictEqual(result.value[0], {
        dateKey: '2024-01',
        categoryName: 'food',
        tagName: 'work',
        totalCents: 3000,
        count: 2,
      })
      assert.deepStrictEqual(result.value[1], {
        dateKey: '2024-02',
        categoryName: 'food',
        tagName: 'work',
        totalCents: 500,
        count: 1,
      })
    }
  })

  it('groups by year with correct totals and counts', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-w', 'work')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-06-20', 'Dinner', 2000)
    await seedExpenseFull(db, 'e3', 'cat-1', '2025-02-05', 'Breakfast', 500)
    await seedExpenseTag(db, 'e1', 'tag-w')
    await seedExpenseTag(db, 'e2', 'tag-w')
    await seedExpenseTag(db, 'e3', 'tag-w')

    const result = await summarize(db, {
      groupBy: 'year',
      from: '2024-01-01',
      to: '2025-12-31',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2)
      assert.deepStrictEqual(result.value[0], {
        dateKey: '2024',
        categoryName: 'food',
        tagName: 'work',
        totalCents: 3000,
        count: 2,
      })
      assert.deepStrictEqual(result.value[1], {
        dateKey: '2025',
        categoryName: 'food',
        tagName: 'work',
        totalCents: 500,
        count: 1,
      })
    }
  })

  it('untagged expenses get tagName empty string', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-01-31',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      assert.strictEqual(result.value[0].tagName, '')
      assert.strictEqual(result.value[0].totalCents, 1000)
      assert.strictEqual(result.value[0].count, 1)
    }
  })

  it('an expense with multiple tags produces one row per tag', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-w', 'work')
    await seedTag(db, 'tag-c', 'client')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)
    await seedExpenseTag(db, 'e1', 'tag-w')
    await seedExpenseTag(db, 'e1', 'tag-c')

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-01-31',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2)
      // Sorted by tagName ASC
      assert.strictEqual(result.value[0].tagName, 'client')
      assert.strictEqual(result.value[0].totalCents, 1000)
      assert.strictEqual(result.value[0].count, 1)
      assert.strictEqual(result.value[1].tagName, 'work')
      assert.strictEqual(result.value[1].totalCents, 1000)
      assert.strictEqual(result.value[1].count, 1)
    }
  })

  it('sorts by dateKey ASC, categoryName ASC, tagName ASC', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-a', 'alpha')
    await seedCategory(db, 'cat-b', 'beta')
    await seedTag(db, 'tag-x', 'xray')
    await seedTag(db, 'tag-y', 'yankee')
    // 2024-02, beta, yankee
    await seedExpenseFull(db, 'e1', 'cat-b', '2024-02-01', 'E1', 100)
    await seedExpenseTag(db, 'e1', 'tag-y')
    // 2024-01, alpha, xray
    await seedExpenseFull(db, 'e2', 'cat-a', '2024-01-01', 'E2', 200)
    await seedExpenseTag(db, 'e2', 'tag-x')
    // 2024-01, beta, xray
    await seedExpenseFull(db, 'e3', 'cat-b', '2024-01-15', 'E3', 300)
    await seedExpenseTag(db, 'e3', 'tag-x')

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-02-28',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 3)
      assert.deepStrictEqual(result.value[0], {
        dateKey: '2024-01',
        categoryName: 'alpha',
        tagName: 'xray',
        totalCents: 200,
        count: 1,
      })
      assert.deepStrictEqual(result.value[1], {
        dateKey: '2024-01',
        categoryName: 'beta',
        tagName: 'xray',
        totalCents: 300,
        count: 1,
      })
      assert.deepStrictEqual(result.value[2], {
        dateKey: '2024-02',
        categoryName: 'beta',
        tagName: 'yankee',
        totalCents: 100,
        count: 1,
      })
    }
  })

  it('returns empty array when no expenses match', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2025-01-01',
      to: '2025-01-31',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 0)
    }
  })

  it('filters by categoryId', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-food', 'food')
    await seedCategory(db, 'cat-utils', 'utilities')
    await seedTag(db, 'tag-w', 'work')
    await seedExpenseFull(db, 'e1', 'cat-food', '2024-01-15', 'Lunch', 1000)
    await seedExpenseFull(db, 'e2', 'cat-utils', '2024-01-20', 'Electric', 500)
    await seedExpenseTag(db, 'e1', 'tag-w')
    await seedExpenseTag(db, 'e2', 'tag-w')

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-01-31',
      categoryId: 'cat-food',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      assert.strictEqual(result.value[0].categoryName, 'food')
    }
  })

  it('filters by tagIds with OR mode', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-w', 'work')
    await seedTag(db, 'tag-c', 'client')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-20', 'Dinner', 500)
    await seedExpenseTag(db, 'e1', 'tag-w')
    await seedExpenseTag(db, 'e2', 'tag-c')

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-01-31',
      tagIds: ['tag-w'],
      tagMode: 'or',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      assert.strictEqual(result.value[0].tagName, 'work')
    }
  })

  it('filters by tagIds with AND mode', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-w', 'work')
    await seedTag(db, 'tag-c', 'client')
    await seedExpenseFull(db, 'e1', 'cat-1', '2024-01-15', 'Lunch', 1000)
    await seedExpenseFull(db, 'e2', 'cat-1', '2024-01-20', 'Dinner', 500)
    await seedExpenseTag(db, 'e1', 'tag-w')
    await seedExpenseTag(db, 'e1', 'tag-c')
    await seedExpenseTag(db, 'e2', 'tag-w')

    const result = await summarize(db, {
      groupBy: 'month',
      from: '2024-01-01',
      to: '2024-01-31',
      tagIds: ['tag-w', 'tag-c'],
      tagMode: 'and',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      // e1 has both work and client, so it produces 2 rows (one per tag)
      assert.strictEqual(result.value.length, 2)
    }
  })
})

// ====================================
// Recurring template DB helper tests (Tasks 4, 6, 8, 10, 12)
// ====================================

const seedRecurring = async (
  db: TestDb,
  id: string,
  categoryId: string,
  description = 'Rent',
  recurrence = 'Monthly',
  anchorDate = '2024-01-15',
  amountCents = 100000,
): Promise<void> => {
  const now = new Date()
  await db.insert(recurring).values({
    id,
    description,
    amountCents,
    categoryId,
    recurrence,
    anchorDate,
    createdAt: now,
    updatedAt: now,
  })
}

const seedRecurringTag = async (
  db: TestDb,
  recurringId: string,
  tagId: string,
): Promise<void> => {
  await db.insert(recurringTag).values({ recurringId, tagId })
}

const seedGeneratedExpense = async (
  db: TestDb,
  id: string,
  categoryId: string,
  recurringIdValue: string | null,
  occurrenceDate: string | null = null,
): Promise<void> => {
  const now = new Date()
  await db.insert(expense).values({
    id,
    description: id,
    amountCents: 100,
    categoryId,
    date: '2024-01-15',
    recurringId: recurringIdValue,
    occurrenceDate,
    createdAt: now,
    updatedAt: now,
  })
}

describe('listRecurring (Task 4)', () => {
  it('returns empty array when no recurring templates exist', async () => {
    const db = await createTestDb()
    const result = await listRecurring(db)
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, [])
    }
  })

  it('returns all recurring templates with category name', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'utilities')
    await seedRecurring(db, 'rec-1', 'cat-1', 'Electric bill', 'Monthly', '2024-01-15')
    await seedRecurring(db, 'rec-2', 'cat-1', 'Water bill', 'Monthly', '2024-01-20')

    const result = await listRecurring(db)
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id).sort()
      assert.deepStrictEqual(ids, ['rec-1', 'rec-2'])
      assert.strictEqual(result.value[0]?.categoryName, 'utilities')
    }
  })

  it('sorts by description case-insensitively ascending', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurring(db, 'rec-z', 'cat-1', 'Zebra bill')
    await seedRecurring(db, 'rec-a', 'cat-1', 'alpha bill')
    await seedRecurring(db, 'rec-m', 'cat-1', 'Middle bill')

    const result = await listRecurring(db)
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const ids = result.value.map((r) => r.id)
      assert.deepStrictEqual(ids, ['rec-a', 'rec-m', 'rec-z'])
    }
  })

  it('returns alphabetized tag names per row', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-z', 'zzz')
    await seedTag(db, 'tag-a', 'aaa')
    await seedRecurring(db, 'rec-1', 'cat-1')
    await seedRecurringTag(db, 'rec-1', 'tag-z')
    await seedRecurringTag(db, 'rec-1', 'tag-a')

    const result = await listRecurring(db)
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value[0]?.tagNames, ['aaa', 'zzz'])
    }
  })

  it('returns empty tagNames array when template has no tags', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurring(db, 'rec-1', 'cat-1')

    const result = await listRecurring(db)
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value[0]?.tagNames, [])
      assert.deepStrictEqual(result.value[0]?.tagIds, [])
    }
  })
})

describe('getRecurringById (Task 6)', () => {
  it('returns null for unknown id', async () => {
    const db = await createTestDb()
    const result = await getRecurringById(db, 'no-such-id')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value, null)
    }
  })

  it('returns null for empty string id', async () => {
    const db = await createTestDb()
    const result = await getRecurringById(db, '')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value, null)
    }
  })

  it('returns the row with correct fields', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'utilities')
    await seedRecurring(db, 'rec-1', 'cat-1', 'Electric', 'Monthly', '2024-03-15', 9999)

    const result = await getRecurringById(db, 'rec-1')
    assert.strictEqual(result.isOk, true)
    if (result.isOk && result.value !== null) {
      assert.strictEqual(result.value.id, 'rec-1')
      assert.strictEqual(result.value.description, 'Electric')
      assert.strictEqual(result.value.amountCents, 9999)
      assert.strictEqual(result.value.categoryId, 'cat-1')
      assert.strictEqual(result.value.categoryName, 'utilities')
      assert.strictEqual(result.value.recurrence, 'Monthly')
      assert.strictEqual(result.value.anchorDate, '2024-03-15')
    }
  })

  it('returns alphabetized tag names and ids', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-z', 'zzz')
    await seedTag(db, 'tag-a', 'aaa')
    await seedRecurring(db, 'rec-1', 'cat-1')
    await seedRecurringTag(db, 'rec-1', 'tag-z')
    await seedRecurringTag(db, 'rec-1', 'tag-a')

    const result = await getRecurringById(db, 'rec-1')
    assert.strictEqual(result.isOk, true)
    if (result.isOk && result.value !== null) {
      assert.deepStrictEqual(result.value.tagNames, ['aaa', 'zzz'])
      assert.deepStrictEqual(result.value.tagIds, ['tag-a', 'tag-z'])
    }
  })
})

describe('createRecurringWithTags (Task 8a)', () => {
  it('creates a template with no tags', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'utilities')

    const result = await createRecurringWithTags(db, {
      description: 'Gas',
      amountCents: 5000,
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-10',
      tagIds: [],
    })
    assert.strictEqual(result.isOk, true)

    const rows = await db.select({ id: recurring.id }).from(recurring)
    assert.strictEqual(rows.length, 1)
  })

  it('creates a template with tag links', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'utilities')
    await seedTag(db, 'tag-1', 'monthly')
    await seedTag(db, 'tag-2', 'auto')

    const result = await createRecurringWithTags(db, {
      description: 'Gas',
      amountCents: 5000,
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-10',
      tagIds: ['tag-1', 'tag-2'],
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const recTagRows = await db
        .select({ tagId: recurringTag.tagId })
        .from(recurringTag)
        .where(eq(recurringTag.recurringId, result.value.id))
      const tagIds = recTagRows.map((r) => r.tagId).sort()
      assert.deepStrictEqual(tagIds, ['tag-1', 'tag-2'])
    }
  })

  it('de-duplicates tag ids silently', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-1', 'auto')

    const result = await createRecurringWithTags(db, {
      description: 'Groceries',
      amountCents: 1000,
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-01',
      tagIds: ['tag-1', 'tag-1'],
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const recTagRows = await db
        .select({ tagId: recurringTag.tagId })
        .from(recurringTag)
        .where(eq(recurringTag.recurringId, result.value.id))
      assert.strictEqual(recTagRows.length, 1)
    }
  })
})

describe('createManyAndRecurring (Task 8b)', () => {
  it('creates a new category and template atomically', async () => {
    const db = await createTestDb()

    const result = await createManyAndRecurring(db, {
      newCategoryName: 'Subscriptions',
      existingCategoryId: null,
      newTagNames: [],
      existingTagIds: [],
      description: 'Netflix',
      amountCents: 1599,
      recurrence: 'Monthly',
      anchorDate: '2024-01-15',
    })
    assert.strictEqual(result.isOk, true)

    const cats = await db.select({ name: category.name }).from(category)
    assert.strictEqual(cats.length, 1)
    assert.strictEqual(cats[0]?.name, 'subscriptions')

    const recs = await db.select({ id: recurring.id }).from(recurring)
    assert.strictEqual(recs.length, 1)
  })

  it('creates new tags and template atomically', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')

    const result = await createManyAndRecurring(db, {
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: ['streaming', 'monthly'],
      existingTagIds: [],
      description: 'Disney+',
      amountCents: 799,
      recurrence: 'Monthly',
      anchorDate: '2024-01-01',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.createdTagIds.length, 2)
    }

    const tags = await db.select({ name: tag.name }).from(tag).orderBy(asc(tag.name))
    assert.deepStrictEqual(
      tags.map((t) => t.name),
      ['monthly', 'streaming'],
    )
  })

  it('errors when both newCategoryName and existingCategoryId are supplied', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')

    const result = await createManyAndRecurring(db, {
      newCategoryName: 'Utilities',
      existingCategoryId: 'cat-1',
      newTagNames: [],
      existingTagIds: [],
      description: 'Gas',
      amountCents: 100,
      recurrence: 'Monthly',
      anchorDate: '2024-01-01',
    })
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /exactly one/)
    }
  })
})

describe('updateRecurringWithTags (Task 10a)', () => {
  it('updates the template fields and replaces tag links', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedCategory(db, 'cat-2', 'utilities')
    await seedTag(db, 'tag-old', 'old')
    await seedTag(db, 'tag-new', 'new')
    await seedRecurring(db, 'rec-1', 'cat-1', 'Old desc', 'Monthly', '2024-01-10', 100)
    await seedRecurringTag(db, 'rec-1', 'tag-old')

    const result = await updateRecurringWithTags(db, {
      id: 'rec-1',
      description: 'Updated desc',
      amountCents: 9999,
      categoryId: 'cat-2',
      recurrence: 'Monthly',
      anchorDate: '2024-01-20',
      tagIds: ['tag-new'],
    })
    assert.strictEqual(result.isOk, true)

    const rows = await db
      .select()
      .from(recurring)
      .where(eq(recurring.id, 'rec-1'))
      .limit(1)
    assert.strictEqual(rows[0]?.description, 'Updated desc')
    assert.strictEqual(rows[0]?.amountCents, 9999)
    assert.strictEqual(rows[0]?.categoryId, 'cat-2')
    assert.strictEqual(rows[0]?.anchorDate, '2024-01-20')

    const recTagRows = await db
      .select({ tagId: recurringTag.tagId })
      .from(recurringTag)
      .where(eq(recurringTag.recurringId, 'rec-1'))
    assert.deepStrictEqual(recTagRows.map((r) => r.tagId), ['tag-new'])
  })

  it('does NOT modify past generated expense rows', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurring(db, 'rec-1', 'cat-1', 'Old desc', 'Monthly', '2024-01-10', 100)
    await seedGeneratedExpense(db, 'exp-gen-1', 'cat-1', 'rec-1', '2024-01-10')

    const before = await db
      .select()
      .from(expense)
      .where(eq(expense.id, 'exp-gen-1'))
      .limit(1)

    await updateRecurringWithTags(db, {
      id: 'rec-1',
      description: 'New desc',
      amountCents: 99999,
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-20',
      tagIds: [],
    })

    const after = await db
      .select()
      .from(expense)
      .where(eq(expense.id, 'exp-gen-1'))
      .limit(1)

    assert.strictEqual(after[0]?.description, before[0]?.description)
    assert.strictEqual(after[0]?.amountCents, before[0]?.amountCents)
    assert.strictEqual(after[0]?.categoryId, before[0]?.categoryId)
  })

  it('returns err for unknown id', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')

    const result = await updateRecurringWithTags(db, {
      id: 'no-such',
      description: 'X',
      amountCents: 1,
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-01',
      tagIds: [],
    })
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /not found/i)
    }
  })
})

describe('updateManyAndRecurring (Task 10b)', () => {
  it('creates a new tag and updates the template atomically', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurring(db, 'rec-1', 'cat-1')

    const result = await updateManyAndRecurring(db, {
      id: 'rec-1',
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: ['brand-new-tag'],
      existingTagIds: [],
      description: 'Updated',
      amountCents: 5000,
      recurrence: 'Monthly',
      anchorDate: '2024-01-10',
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.createdTagIds.length, 1)
    }

    const tags = await db.select({ name: tag.name }).from(tag)
    assert.strictEqual(tags.length, 1)
    assert.strictEqual(tags[0]?.name, 'brand-new-tag')
  })

  it('does NOT modify past generated expense rows', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurring(db, 'rec-1', 'cat-1', 'Old desc', 'Monthly', '2024-01-01', 100)
    await seedGeneratedExpense(db, 'exp-gen-1', 'cat-1', 'rec-1', '2024-01-01')

    const before = await db
      .select()
      .from(expense)
      .where(eq(expense.id, 'exp-gen-1'))
      .limit(1)

    await updateManyAndRecurring(db, {
      id: 'rec-1',
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: [],
      existingTagIds: [],
      description: 'New desc',
      amountCents: 99999,
      recurrence: 'Monthly',
      anchorDate: '2024-01-20',
    })

    const after = await db
      .select()
      .from(expense)
      .where(eq(expense.id, 'exp-gen-1'))
      .limit(1)

    assert.strictEqual(after[0]?.description, before[0]?.description)
    assert.strictEqual(after[0]?.amountCents, before[0]?.amountCents)
    assert.strictEqual(after[0]?.categoryId, before[0]?.categoryId)
  })
})

describe('deleteRecurring (Task 12)', () => {
  it('deletes the template and its recurringTag links', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-1', 'auto')
    await seedRecurring(db, 'rec-1', 'cat-1')
    await seedRecurringTag(db, 'rec-1', 'tag-1')

    const result = await deleteRecurring(db, 'rec-1')
    assert.strictEqual(result.isOk, true)

    const recs = await db.select({ id: recurring.id }).from(recurring)
    assert.strictEqual(recs.length, 0)

    const recTagRows = await db.select().from(recurringTag)
    assert.strictEqual(recTagRows.length, 0)
  })

  it('sets recurringId = NULL on past generated expenses (not deleted)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurring(db, 'rec-1', 'cat-1')
    await seedGeneratedExpense(db, 'exp-gen-1', 'cat-1', 'rec-1', '2024-01-15')
    await seedGeneratedExpense(db, 'exp-gen-2', 'cat-1', 'rec-1', '2024-02-15')

    const result = await deleteRecurring(db, 'rec-1')
    assert.strictEqual(result.isOk, true)

    // Expense rows must still exist
    const expenses = await db.select({ id: expense.id }).from(expense)
    assert.strictEqual(expenses.length, 2)

    // recurringId must be NULL on both
    const withRecurring = await db
      .select({ recurringId: expense.recurringId })
      .from(expense)
      .where(eq(expense.id, 'exp-gen-1'))
      .limit(1)
    assert.strictEqual(withRecurring[0]?.recurringId, null)
  })

  it('returns err for unknown id', async () => {
    const db = await createTestDb()
    const result = await deleteRecurring(db, 'no-such')
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /not found/i)
    }
  })
})

// ---------------------------------------------------------------------------
// Helpers for materialization tests
// ---------------------------------------------------------------------------

const seedRecurringForMat = async (
  db: TestDb,
  opts: {
    id: string
    categoryId: string
    description?: string
    amountCents?: number
    recurrence?: 'Monthly' | 'Quarterly' | 'Yearly'
    anchorDate?: string
    createdAt?: Date
  },
): Promise<void> => {
  const now = opts.createdAt ?? new Date()
  await db.insert(recurring).values({
    id: opts.id,
    description: opts.description ?? opts.id,
    amountCents: opts.amountCents ?? 1000,
    categoryId: opts.categoryId,
    recurrence: opts.recurrence ?? 'Monthly',
    anchorDate: opts.anchorDate ?? '2024-01-15',
    createdAt: now,
    updatedAt: now,
  })
}

const seedRecurringTagLink = async (
  db: TestDb,
  recurringId: string,
  tagId: string,
): Promise<void> => {
  await db.insert(recurringTag).values({ recurringId, tagId })
}

// ---------------------------------------------------------------------------
// materializeRecurring tests (Issue 14)
// ---------------------------------------------------------------------------

describe('materializeRecurring (Issue 14)', () => {
  it('returns ok with zeros when there are no templates', async () => {
    const db = await createTestDb()
    const result = await materializeRecurring(db, '2024-06-01')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.generated, 0)
      assert.strictEqual(result.value.skipped, 0)
      assert.deepStrictEqual(result.value.failed, [])
    }
  })

  it('generates one expense row for one past occurrence (Monthly)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    // Created 2024-01-01, anchor 15th Monthly → first occurrence is Jan 15
    await seedRecurringForMat(db, {
      id: 'rec-1',
      categoryId: 'cat-1',
      description: 'Rent',
      amountCents: 120000,
      recurrence: 'Monthly',
      anchorDate: '2024-01-15',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })

    const result = await materializeRecurring(db, '2024-01-15')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.generated, 1)
      assert.strictEqual(result.value.skipped, 0)
      assert.deepStrictEqual(result.value.failed, [])
    }

    const rows = await db
      .select({
        description: expense.description,
        amountCents: expense.amountCents,
        date: expense.date,
        occurrenceDate: expense.occurrenceDate,
        recurringId: expense.recurringId,
      })
      .from(expense)
    assert.strictEqual(rows.length, 1)
    assert.strictEqual(rows[0]?.recurringId, 'rec-1')
    assert.strictEqual(rows[0]?.occurrenceDate, '2024-01-15')
    assert.strictEqual(rows[0]?.date, '2024-01-15')
    assert.strictEqual(rows[0]?.description, 'Rent')
    assert.strictEqual(rows[0]?.amountCents, 120000)
  })

  it('copies tags from the template to generated expense rows', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'tag-sub', 'subscriptions')
    await seedTag(db, 'tag-auto', 'auto')
    await seedRecurringForMat(db, {
      id: 'rec-tags',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-10',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })
    await seedRecurringTagLink(db, 'rec-tags', 'tag-sub')
    await seedRecurringTagLink(db, 'rec-tags', 'tag-auto')

    const result = await materializeRecurring(db, '2024-01-10')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.generated, 1)
    }

    const expenseRows = await db.select({ id: expense.id }).from(expense)
    const expenseId = expenseRows[0]?.id
    assert.ok(expenseId)

    const tagLinks = await db
      .select({ tagId: expenseTag.tagId })
      .from(expenseTag)
      .where(eq(expenseTag.expenseId, expenseId))
    const tagIds = tagLinks.map((r) => r.tagId).sort()
    assert.deepStrictEqual(tagIds, ['tag-auto', 'tag-sub'])
  })

  it('idempotent: second call generates 0 and skips N', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurringForMat(db, {
      id: 'rec-idem',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-10',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })

    const first = await materializeRecurring(db, '2024-03-10')
    assert.strictEqual(first.isOk, true)
    if (first.isOk) {
      assert.strictEqual(first.value.generated, 3) // Jan 10, Feb 10, Mar 10
    }

    // Second run: max(occurrenceDate) = '2024-03-10' = today, so
    // occurrencesToGenerate returns [] — no inserts attempted.
    const second = await materializeRecurring(db, '2024-03-10')
    assert.strictEqual(second.isOk, true)
    if (second.isOk) {
      assert.strictEqual(second.value.generated, 0)
      assert.strictEqual(second.value.skipped, 0)
      assert.deepStrictEqual(second.value.failed, [])
    }

    // Row count is unchanged
    const rows = await db.select({ id: expense.id }).from(expense)
    assert.strictEqual(rows.length, 3)
  })

  it('catch-up generates all missed occurrences up to today', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurringForMat(db, {
      id: 'rec-catchup',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-05',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })

    const result = await materializeRecurring(db, '2024-04-05')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.generated, 4)
    }

    const rows = await db
      .select({ occurrenceDate: expense.occurrenceDate })
      .from(expense)
      .orderBy(asc(expense.occurrenceDate))
    assert.deepStrictEqual(
      rows.map((r) => r.occurrenceDate),
      ['2024-01-05', '2024-02-05', '2024-03-05', '2024-04-05'],
    )
  })

  it('first-occurrence rule: does not generate on or before template createdAt date', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    // Anchor is the 15th, createdAt IS the 15th — first valid occurrence is next month
    await seedRecurringForMat(db, {
      id: 'rec-first',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-15',
      createdAt: new Date('2024-01-15T20:00:00Z'), // ET is UTC-5, so this is Jan 15 ET
    })

    const result = await materializeRecurring(db, '2024-01-15')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.generated, 0)
    }
  })

  it('error in one template is isolated: other templates still generate', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')

    // Valid template
    await seedRecurringForMat(db, {
      id: 'rec-good',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-10',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })
    // Template with an invalid recurrence value to force an error
    await db.insert(recurring).values({
      id: 'rec-bad',
      description: 'bad template',
      amountCents: 100,
      categoryId: 'cat-1',
      recurrence: 'InvalidRecurrence',
      anchorDate: '2024-01-10',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date(),
    })

    const result = await materializeRecurring(db, '2024-01-10')
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.generated, 1)
      assert.strictEqual(result.value.failed.length, 1)
      assert.strictEqual(result.value.failed[0]?.recurringId, 'rec-bad')
    }
  })
})

// ---------------------------------------------------------------------------
// listExpenses recurringId tests (Issue 14, Task 10)
// ---------------------------------------------------------------------------

describe('listExpenses recurringId (Issue 14)', () => {
  it('returns null recurringId for manually entered expenses', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e-manual', 'cat-1', '2024-03-01', 'Coffee')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value[0]?.recurringId, null)
    }
  })

  it('returns non-null recurringId for generated expenses', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedRecurringForMat(db, {
      id: 'rec-1',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-15',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })

    await materializeRecurring(db, '2024-01-15')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      assert.strictEqual(result.value[0]?.recurringId, 'rec-1')
    }
  })

  it('returns mixed null and non-null recurringIds in the same result set', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpenseFull(db, 'e-manual', 'cat-1', '2024-01-10', 'Manual')
    await seedRecurringForMat(db, {
      id: 'rec-1',
      categoryId: 'cat-1',
      recurrence: 'Monthly',
      anchorDate: '2024-01-15',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    })
    await materializeRecurring(db, '2024-01-15')

    const result = await listExpenses(db, {})
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2)
      const recurringIds = result.value.map((r) => r.recurringId)
      assert.ok(recurringIds.includes(null))
      assert.ok(recurringIds.includes('rec-1'))
    }
  })
})
