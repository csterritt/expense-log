// ====================================
// Tests for src/lib/db/summary-access.ts
//
// To run: cd to the project root and run `bun test`.
// ====================================

import { describe, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import assert from 'node:assert'

import { category, expense, expenseTag, recurring, tag, schema } from '../src/db/schema'
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

const seedCat = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(category).values({ id, name, createdAt: now, updatedAt: now })
}

const seedTag = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(tag).values({ id, name, createdAt: now, updatedAt: now })
}

const seedExpense = async (
  db: TestDb,
  id: string,
  categoryId: string,
  date: string,
  amountCents: number,
  recurringId: string | null = null,
  occurrenceDate: string | null = null,
): Promise<void> => {
  const now = new Date()
  await db.insert(expense).values({
    id,
    description: id,
    amountCents,
    categoryId,
    date,
    recurringId,
    occurrenceDate,
    createdAt: now,
    updatedAt: now,
  })
}

const seedExpenseTag = async (db: TestDb, expenseId: string, tagId: string): Promise<void> => {
  await db.insert(expenseTag).values({ expenseId, tagId })
}

const seedRecurring = async (db: TestDb, id: string, categoryId: string): Promise<void> => {
  const now = new Date()
  await db.insert(recurring).values({
    id,
    description: id,
    amountCents: 500,
    categoryId,
    recurrence: 'Monthly',
    anchorDate: '2024-01-01',
    createdAt: now,
    updatedAt: now,
  })
}

// ====================================
// Dataset used across most tests:
//
//  categories: food, transport, utilities
//  tags:       travel, dining, work
//
//  Expenses:
//   e-jan-food   cat:food        date:2024-01-15  $100   tags:[dining, travel]
//   e-jan-trans  cat:transport   date:2024-01-20  $200   tags:[travel]
//   e-mar-food   cat:food        date:2024-03-10  $300   tags:[dining]
//   e-dec-utils  cat:utilities   date:2023-12-05  $400   tags:[]  (zero-tag)
//   e-rec        cat:food        date:2024-04-01  $150   tags:[work]  (materialized recurring)
// ====================================

const buildDataset = async (db: TestDb): Promise<void> => {
  await seedCat(db, 'cat-food', 'food')
  await seedCat(db, 'cat-trans', 'transport')
  await seedCat(db, 'cat-utils', 'utilities')

  await seedTag(db, 'tag-travel', 'travel')
  await seedTag(db, 'tag-dining', 'dining')
  await seedTag(db, 'tag-work', 'work')

  await seedRecurring(db, 'rec-1', 'cat-food')

  await seedExpense(db, 'e-jan-food', 'cat-food', '2024-01-15', 100)
  await seedExpense(db, 'e-jan-trans', 'cat-trans', '2024-01-20', 200)
  await seedExpense(db, 'e-mar-food', 'cat-food', '2024-03-10', 300)
  await seedExpense(db, 'e-dec-utils', 'cat-utils', '2023-12-05', 400)
  await seedExpense(db, 'e-rec', 'cat-food', '2024-04-01', 150, 'rec-1', '2024-04-01')

  await seedExpenseTag(db, 'e-jan-food', 'tag-dining')
  await seedExpenseTag(db, 'e-jan-food', 'tag-travel')
  await seedExpenseTag(db, 'e-jan-trans', 'tag-travel')
  await seedExpenseTag(db, 'e-mar-food', 'tag-dining')
  await seedExpenseTag(db, 'e-rec', 'tag-work')
}

describe('summarize — dimension: time', () => {
  it('returns timePeriod but no categoryName or tagName', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.ok(result.value.length > 0)
      for (const row of result.value) {
        assert.strictEqual('categoryName' in row, false)
        assert.strictEqual('tagName' in row, false)
        assert.ok(typeof row.timePeriod === 'string')
        assert.ok(typeof row.count === 'number')
        assert.ok(typeof row.totalCents === 'number')
      }
    }
  })

  it('month granularity produces Mmm timePeriod labels', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-03-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const periods = result.value.map((r) => r.timePeriod)
      assert.ok(periods.includes('Jan'), `expected Jan in ${periods.join(', ')}`)
      assert.ok(periods.includes('Mar'), `expected Mar in ${periods.join(', ')}`)
      for (const p of periods) {
        assert.match(p, /^[A-Z][a-z]{2}$/, `"${p}" is not a Mmm label`)
      }
    }
  })

  it('quarter granularity produces Mmm-Mmm timePeriod labels', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'quarter',
      filters: { from: '2024-01-01', to: '2024-04-30' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      for (const row of result.value) {
        assert.match(row.timePeriod, /^[A-Z][a-z]{2}-[A-Z][a-z]{2}$/, `"${row.timePeriod}" is not Mmm-Mmm`)
      }
    }
  })

  it('year granularity produces YYYY timePeriod labels', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'year',
      filters: {},
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      for (const row of result.value) {
        assert.match(row.timePeriod, /^\d{4}$/, `"${row.timePeriod}" is not YYYY`)
      }
      const periods = result.value.map((r) => r.timePeriod)
      assert.ok(periods.includes('2023'), `expected 2023 in ${periods.join(', ')}`)
      assert.ok(periods.includes('2024'), `expected 2024 in ${periods.join(', ')}`)
    }
  })

  it('aggregates count and totalCents within each time period', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      const row = result.value[0]
      assert.strictEqual(row?.timePeriod, 'Jan')
      assert.strictEqual(row?.count, 2)
      assert.strictEqual(row?.totalCents, 300)
    }
  })
})

describe('summarize — dimension: category', () => {
  it('returns categoryName and timePeriod but no tagName', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.ok(result.value.length > 0)
      for (const row of result.value) {
        assert.ok(typeof row.categoryName === 'string')
        assert.ok(typeof row.timePeriod === 'string')
        assert.strictEqual('tagName' in row, false)
      }
    }
  })

  it('groups by category and month, sums correctly', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2)
      const food = result.value.find((r) => r.categoryName === 'food')
      const trans = result.value.find((r) => r.categoryName === 'transport')
      assert.ok(food, 'expected food row')
      assert.ok(trans, 'expected transport row')
      assert.strictEqual(food?.totalCents, 100)
      assert.strictEqual(food?.count, 1)
      assert.strictEqual(trans?.totalCents, 200)
      assert.strictEqual(trans?.count, 1)
    }
  })

  it('includes zero-tag expenses', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2023-12-01', to: '2023-12-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      assert.strictEqual(result.value[0]?.categoryName, 'utilities')
      assert.strictEqual(result.value[0]?.totalCents, 400)
    }
  })
})

describe('summarize — dimension: tag', () => {
  it('returns tagName and timePeriod but no categoryName', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'tag',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.ok(result.value.length > 0)
      for (const row of result.value) {
        assert.ok(typeof row.tagName === 'string')
        assert.ok(typeof row.timePeriod === 'string')
        assert.strictEqual('categoryName' in row, false)
      }
    }
  })

  it('double-counts multi-tagged expense under each tag', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'tag',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-15' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const dining = result.value.find((r) => r.tagName === 'dining')
      const travel = result.value.find((r) => r.tagName === 'travel')
      assert.ok(dining, 'expected dining row')
      assert.ok(travel, 'expected travel row')
      assert.strictEqual(dining?.totalCents, 100)
      assert.strictEqual(travel?.totalCents, 100)
      assert.strictEqual(dining?.count, 1)
      assert.strictEqual(travel?.count, 1)
    }
  })

  it('excludes zero-tag expenses', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'tag',
      granularity: 'month',
      filters: { from: '2023-12-01', to: '2023-12-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 0)
    }
  })
})

describe('summarize — dimension: category-tag', () => {
  it('returns categoryName, tagName, and timePeriod', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category-tag',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.ok(result.value.length > 0)
      for (const row of result.value) {
        assert.ok(typeof row.categoryName === 'string')
        assert.ok(typeof row.tagName === 'string')
        assert.ok(typeof row.timePeriod === 'string')
      }
    }
  })

  it('excludes zero-tag expenses', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category-tag',
      granularity: 'month',
      filters: { from: '2023-12-01', to: '2023-12-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 0)
    }
  })

  it('groups by category + tag + timePeriod', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category-tag',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const foodDining = result.value.find(
        (r) => r.categoryName === 'food' && r.tagName === 'dining',
      )
      const foodTravel = result.value.find(
        (r) => r.categoryName === 'food' && r.tagName === 'travel',
      )
      const transTravel = result.value.find(
        (r) => r.categoryName === 'transport' && r.tagName === 'travel',
      )
      assert.ok(foodDining, 'expected food+dining row')
      assert.ok(foodTravel, 'expected food+travel row')
      assert.ok(transTravel, 'expected transport+travel row')
    }
  })
})

describe('summarize — tag-AND filter', () => {
  it('single-tag filter narrows to expenses carrying that tag', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-03-31', tagIds: ['tag-dining'] },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      for (const row of result.value) {
        assert.strictEqual(row.categoryName, 'food')
      }
      const totalCount = result.value.reduce((s, r) => s + r.count, 0)
      assert.strictEqual(totalCount, 2)
    }
  })

  it('two-tag AND filter keeps only expenses carrying both tags', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-03-31', tagIds: ['tag-dining', 'tag-travel'] },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const totalCount = result.value.reduce((s, r) => s + r.count, 0)
      assert.strictEqual(totalCount, 1)
      assert.strictEqual(result.value[0]?.categoryName, 'food')
    }
  })

  it('three-tag AND filter with no matches returns empty array', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: {
        from: '2024-01-01',
        to: '2024-03-31',
        tagIds: ['tag-dining', 'tag-travel', 'tag-work'],
      },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 0)
    }
  })
})

describe('summarize — empty filter set returns []', () => {
  it('returns empty array when date range matches nothing', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2020-01-01', to: '2020-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, [])
    }
  })
})

describe('summarize — materialized recurring rows', () => {
  it('counts materialized recurring expense exactly like a manual row', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-04-01', to: '2024-04-30' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 1)
      assert.strictEqual(result.value[0]?.categoryName, 'food')
      assert.strictEqual(result.value[0]?.count, 1)
      assert.strictEqual(result.value[0]?.totalCents, 150)
    }
  })
})

describe('summarize — default sort', () => {
  it('default sort is group columns asc (case-insensitive) then timePeriod asc', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-04-30' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const catPeriods = result.value.map((r) => `${r.categoryName}:${r.timePeriod}`)
      const sorted = [...catPeriods].sort((a, b) => a.localeCompare(b))
      assert.deepStrictEqual(catPeriods, sorted)
    }
  })
})

describe('summarize — explicit sort override', () => {
  it('sort by totalCents desc overrides the default', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-04-30' },
      sort: [{ column: 'totalCents', direction: 'desc' }],
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const totals = result.value.map((r) => r.totalCents)
      for (let i = 1; i < totals.length; i++) {
        assert.ok(
          (totals[i - 1] as number) >= (totals[i] as number),
          `expected descending totalCents at index ${i}`,
        )
      }
    }
  })
})
