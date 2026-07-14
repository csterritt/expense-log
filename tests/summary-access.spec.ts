// ====================================
// Tests for src/lib/db/summary-access.ts
//
// To run: cd to the project root and run `bun test`.
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'

import { category, expense, expenseTag, recurring, tag, schema } from '../src/db/schema'
import { summarize } from '../src/lib/db/summary-access'
import type { DrizzleClient } from '../src/local-types'
import { createTestDb, seedCategory, seedTag, seedExpense, seedExpenseTag, seedRecurring } from './helpers/test-db'

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
  await seedCategory(db, 'cat-food', 'food')
  await seedCategory(db, 'cat-trans', 'transport')
  await seedCategory(db, 'cat-utils', 'utilities')

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

  it('month granularity produces Mmm YYYY timePeriod labels', async () => {
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
      assert.ok(periods.includes('Jan 2024'), `expected Jan 2024 in ${periods.join(', ')}`)
      assert.ok(periods.includes('Mar 2024'), `expected Mar 2024 in ${periods.join(', ')}`)
      for (const p of periods) {
        assert.match(p, /^[A-Z][a-z]{2} \d{4}$/, `"${p}" is not a Mmm YYYY label`)
      }
    }
  })

  it('quarter granularity produces Mmm-Mmm YYYY timePeriod labels', async () => {
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
        assert.match(row.timePeriod, /^[A-Z][a-z]{2}-[A-Z][a-z]{2} \d{4}$/, `"${row.timePeriod}" is not Mmm-Mmm YYYY`)
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
      assert.strictEqual(row?.timePeriod, 'Jan 2024')
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
  it('default sort is group columns asc (case-insensitive) then timePeriod chronological asc', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2024-01-01', to: '2024-04-30' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const cats = result.value.map((r) => r.categoryName ?? '')
      for (let i = 1; i < cats.length; i++) {
        assert.ok(
          cats[i - 1]!.localeCompare(cats[i]!) <= 0,
          `expected category sort at index ${i}: "${cats[i - 1]}" should be <= "${cats[i]}"`
        )
      }
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

// ====================================
// Task 7: Year-bearing labels + chronological sort
// ====================================

describe('summarize — year-bearing labels', () => {
  it('month granularity produces Mmm YYYY labels (not bare Mmm)', async () => {
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
      assert.ok(periods.includes('Jan 2024'), `expected "Jan 2024" in ${periods.join(', ')}`)
      assert.ok(periods.includes('Mar 2024'), `expected "Mar 2024" in ${periods.join(', ')}`)
      for (const p of periods) {
        assert.match(p, /^[A-Z][a-z]{2} \d{4}$/, `"${p}" is not a Mmm YYYY label`)
      }
    }
  })

  it('quarter granularity produces Mmm-Mmm YYYY labels', async () => {
    const db = await createTestDb()
    await buildDataset(db)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'quarter',
      filters: { from: '2024-01-01', to: '2024-06-30' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const periods = result.value.map((r) => r.timePeriod)
      for (const p of periods) {
        assert.match(p, /^[A-Z][a-z]{2}-[A-Z][a-z]{2} \d{4}$/, `"${p}" is not a Mmm-Mmm YYYY label`)
      }
      assert.ok(periods.includes('Jan-Mar 2024'), `expected "Jan-Mar 2024" in ${periods.join(', ')}`)
    }
  })

  it('year granularity still produces YYYY labels (unchanged)', async () => {
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
    }
  })
})

describe('summarize — chronological sort by internal key', () => {
  it('Dec 2025 and Jan 2026 are distinct rows (no cross-year aggregation)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-misc', 'misc')
    await seedExpense(db, 'e-dec25', 'cat-misc', '2025-12-15', 500)
    await seedExpense(db, 'e-jan26', 'cat-misc', '2026-01-10', 600)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2025-12-01', to: '2026-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2, `expected 2 rows but got: ${result.value.map((r) => r.timePeriod).join(', ')}`)
      const periods = result.value.map((r) => r.timePeriod)
      assert.ok(periods.includes('Dec 2025'), `expected "Dec 2025" in ${periods.join(', ')}`)
      assert.ok(periods.includes('Jan 2026'), `expected "Jan 2026" in ${periods.join(', ')}`)
    }
  })

  it('default sort places Dec 2025 before Jan 2026 in ascending order', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-misc2', 'misc2')
    await seedExpense(db, 'e-dec25b', 'cat-misc2', '2025-12-15', 500)
    await seedExpense(db, 'e-jan26b', 'cat-misc2', '2026-01-10', 600)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2025-12-01', to: '2026-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.strictEqual(result.value.length, 2)
      assert.strictEqual(result.value[0]?.timePeriod, 'Dec 2025', `expected first row to be "Dec 2025", got "${result.value[0]?.timePeriod}"`)
      assert.strictEqual(result.value[1]?.timePeriod, 'Jan 2026', `expected second row to be "Jan 2026", got "${result.value[1]?.timePeriod}"`)
    }
  })

  it('Apr 2026 sorts after Jan/Feb/Mar 2026 (chronological, not alphabetical)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-ord', 'ord')
    await seedExpense(db, 'e-jan26-ord', 'cat-ord', '2026-01-05', 100)
    await seedExpense(db, 'e-feb26-ord', 'cat-ord', '2026-02-05', 200)
    await seedExpense(db, 'e-mar26-ord', 'cat-ord', '2026-03-05', 300)
    await seedExpense(db, 'e-apr26-ord', 'cat-ord', '2026-04-05', 400)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2026-01-01', to: '2026-04-30' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const periods = result.value.map((r) => r.timePeriod)
      assert.deepStrictEqual(periods, ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'], `got: ${periods.join(', ')}`)
    }
  })

  it('quarters within a year sort chronologically: Jan-Mar before Apr-Jun before Jul-Sep before Oct-Dec', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-qtr', 'qtr')
    await seedExpense(db, 'e-q1', 'cat-qtr', '2026-01-15', 100)
    await seedExpense(db, 'e-q2', 'cat-qtr', '2026-04-15', 200)
    await seedExpense(db, 'e-q3', 'cat-qtr', '2026-07-15', 300)
    await seedExpense(db, 'e-q4', 'cat-qtr', '2026-10-15', 400)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'quarter',
      filters: { from: '2026-01-01', to: '2026-12-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const periods = result.value.map((r) => r.timePeriod)
      assert.deepStrictEqual(periods, ['Jan-Mar 2026', 'Apr-Jun 2026', 'Jul-Sep 2026', 'Oct-Dec 2026'], `got: ${periods.join(', ')}`)
    }
  })

  it('cross-year quarters sort chronologically: Oct-Dec 2025 before Jan-Mar 2026', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-cqtr', 'cqtr')
    await seedExpense(db, 'e-q4-25', 'cat-cqtr', '2025-10-15', 100)
    await seedExpense(db, 'e-q1-26', 'cat-cqtr', '2026-01-15', 200)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'quarter',
      filters: { from: '2025-10-01', to: '2026-03-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const periods = result.value.map((r) => r.timePeriod)
      assert.deepStrictEqual(periods, ['Oct-Dec 2025', 'Jan-Mar 2026'], `got: ${periods.join(', ')}`)
    }
  })

  it('when sorting by count, ties retain chronological time-period ordering', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-tie', 'tie')
    await seedExpense(db, 'e-jan26-t1', 'cat-tie', '2026-01-05', 100)
    await seedExpense(db, 'e-feb26-t1', 'cat-tie', '2026-02-05', 100)
    await seedExpense(db, 'e-mar26-t1', 'cat-tie', '2026-03-05', 100)
    const result = await summarize(db, {
      dimension: 'time',
      granularity: 'month',
      filters: { from: '2026-01-01', to: '2026-03-31' },
      sort: [{ column: 'count', direction: 'asc' }],
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const periods = result.value.map((r) => r.timePeriod)
      assert.deepStrictEqual(periods, ['Jan 2026', 'Feb 2026', 'Mar 2026'], `expected chronological tie-break, got: ${periods.join(', ')}`)
    }
  })

  it('category dimension default sort: group asc then chronological timePeriod asc (cross-year)', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-alpha', 'alpha')
    await seedExpense(db, 'e-alpha-dec25', 'cat-alpha', '2025-12-10', 100)
    await seedExpense(db, 'e-alpha-jan26', 'cat-alpha', '2026-01-10', 200)
    const result = await summarize(db, {
      dimension: 'category',
      granularity: 'month',
      filters: { from: '2025-12-01', to: '2026-01-31' },
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const rows = result.value
      assert.strictEqual(rows.length, 2)
      assert.strictEqual(rows[0]?.timePeriod, 'Dec 2025')
      assert.strictEqual(rows[1]?.timePeriod, 'Jan 2026')
    }
  })

  it('category-tag dimension: sort=category asc ties break on tag asc then timePeriod asc', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-ct1', 'aacat')
    await seedCategory(db, 'cat-ct2', 'zzcat')
    await seedTag(db, 'tag-ct1', 'aatag')
    await seedTag(db, 'tag-ct2', 'zztag')
    await seedExpense(db, 'e-ct-1', 'cat-ct1', '2026-02-01', 100)
    await seedExpense(db, 'e-ct-2', 'cat-ct1', '2026-01-01', 200)
    await seedExpenseTag(db, 'e-ct-1', 'tag-ct1')
    await seedExpenseTag(db, 'e-ct-2', 'tag-ct1')
    const result = await summarize(db, {
      dimension: 'category-tag',
      granularity: 'month',
      filters: { from: '2026-01-01', to: '2026-02-28' },
      sort: [{ column: 'categoryName', direction: 'asc' }],
    })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      const rows = result.value
      assert.ok(rows.length >= 2)
      const aaRows = rows.filter((r) => r.categoryName === 'aacat')
      assert.ok(aaRows.length >= 2)
      assert.strictEqual(aaRows[0]?.timePeriod, 'Jan 2026', `expected Jan 2026 first, got ${aaRows[0]?.timePeriod}`)
      assert.strictEqual(aaRows[1]?.timePeriod, 'Feb 2026', `expected Feb 2026 second, got ${aaRows[1]?.timePeriod}`)
    }
  })
})
