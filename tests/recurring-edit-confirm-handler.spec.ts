// ====================================
// Tests for recurring-edit confirmation handler hardening (Task 28 RED)
//
// Mirrors recurring-confirm-handler.spec.ts (Task 25) for the recurring-edit
// confirmation route. Covers:
//   - RecurringConfirmationPayload HMAC signing utilities (shared with create,
//     re-asserted here for the edit confirm path)
//   - Tamper rejection: modified amount, description, injected tagId, swapped
//     category, modified recurrence, modified anchorDate all fail verification
//   - updateManyAndRecurring atomicity: no partial rows on unique-constraint
//     error (tag collision, category collision)
//   - Pre-existing attachments survive a no-op edit (updateRecurringWithTags
//     replaces the link set with the same ids)
//   - Toggling chips off detaches the corresponding tags atomically with the
//     edit (updateManyAndRecurring / updateRecurringWithTags replace the full
//     link set so removed ids vanish)
//
// Run: cd to project root and type 'bun test tests/recurring-edit-confirm-handler.spec.ts'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sqlite'

import { category, tag, recurring, recurringTag, schema } from '../src/db/schema'
import {
  updateManyAndRecurring,
  updateRecurringWithTags,
} from '../src/lib/db/expense-access'
import type { DrizzleClient } from '../src/local-types'

// ---------------------------------------------------------------------------
// In-memory test DB
// ---------------------------------------------------------------------------

type RunnableQuery = { run: () => unknown }
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
    'CREATE TABLE tag (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run('CREATE UNIQUE INDEX tag_name_lower_unique ON tag (lower(name))')
  sqlite.run(
    'CREATE TABLE recurring (id TEXT PRIMARY KEY, description TEXT NOT NULL, amountCents INTEGER NOT NULL, categoryId TEXT NOT NULL REFERENCES category(id) ON DELETE RESTRICT, recurrence TEXT NOT NULL, anchorDate TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
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

const seedTag = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(tag).values({ id, name, createdAt: now, updatedAt: now })
}

const seedRecurring = async (
  db: TestDb,
  id: string,
  categoryId: string,
  tagIds: string[],
): Promise<void> => {
  const now = new Date()
  await db.insert(recurring).values({
    id,
    description: 'Monthly rent',
    amountCents: 150000,
    categoryId,
    recurrence: 'monthly',
    anchorDate: '2026-01-01',
    createdAt: now,
    updatedAt: now,
  })
  for (const tagId of tagIds) {
    await db.insert(recurringTag).values({ recurringId: id, tagId })
  }
}

// ---------------------------------------------------------------------------
// 1. HMAC signing utilities — re-asserted for the recurring-edit confirm path
// ---------------------------------------------------------------------------

type RecurringConfirmationPayload = {
  description: string
  amount: string
  recurrence: string
  anchorDate: string
  category: string
  tagIds: string[]
  newTags: string
}

describe('signRecurringConfirmationPayload / verifyRecurringConfirmationPayload (Task 28 — edit path)', () => {
  const TEST_KEY = 'test-signing-key-32-chars-min!!'

  const basePayload: RecurringConfirmationPayload = {
    description: 'Monthly rent',
    amount: '1500.00',
    recurrence: 'monthly',
    anchorDate: '2026-01-01',
    category: 'housing',
    tagIds: ['01JFAKETAGID0000000000000A'],
    newTags: '',
  }

  const loadHmac = async () => {
    const mod = await import('../src/lib/confirmation-hmac')
    return mod as {
      signRecurringConfirmationPayload: (p: RecurringConfirmationPayload, key: string) => Promise<string>
      verifyRecurringConfirmationPayload: (p: RecurringConfirmationPayload, sig: string, key: string | undefined) => Promise<boolean>
    }
  }

  it('signs a recurring-edit payload and successfully verifies the same payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    assert.strictEqual(typeof signature, 'string')
    assert.ok(signature.length > 10)

    const isValid = await verifyRecurringConfirmationPayload(basePayload, signature, TEST_KEY)
    assert.strictEqual(isValid, true)
  })

  it('rejects verification when the description is tampered on edit payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered = { ...basePayload, description: 'Weekly coffee' }
    assert.strictEqual(await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY), false)
  })

  it('rejects verification when the amount is tampered on edit payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered = { ...basePayload, amount: '2000.00' }
    assert.strictEqual(await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY), false)
  })

  it('rejects verification when a tagId is injected on edit payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered = { ...basePayload, tagIds: [...basePayload.tagIds, '01JFAKETAGID0000000000000B'] }
    assert.strictEqual(await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY), false)
  })

  it('rejects verification when the category is swapped on edit payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered = { ...basePayload, category: 'transport' }
    assert.strictEqual(await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY), false)
  })

  it('rejects verification when the recurrence is tampered on edit payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered = { ...basePayload, recurrence: 'weekly' }
    assert.strictEqual(await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY), false)
  })

  it('rejects verification when the anchorDate is tampered on edit payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered = { ...basePayload, anchorDate: '2026-06-01' }
    assert.strictEqual(await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY), false)
  })

  it('fails closed when the signing key is absent (undefined)', async () => {
    const { verifyRecurringConfirmationPayload } = await loadHmac()
    assert.strictEqual(await verifyRecurringConfirmationPayload(basePayload, 'any-sig', undefined), false)
  })
})

// ---------------------------------------------------------------------------
// 2. updateManyAndRecurring atomicity — no partial rows on constraint failure
// ---------------------------------------------------------------------------

describe('updateManyAndRecurring atomicity (Task 28)', () => {
  it('leaves no new tag rows when a new tag name collides mid-batch', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'existing-tag', 'utilities')
    await seedRecurring(db, 'rec-1', 'cat-1', [])

    const tagCountBefore = await db.select({ count: sql<number>`count(*)` }).from(tag)
    const recurringCountBefore = await db.select({ count: sql<number>`count(*)` }).from(recurring)

    const result = await updateManyAndRecurring(db, {
      id: 'rec-1',
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: ['utilities'],
      existingTagIds: [],
      description: 'Monthly rent',
      amountCents: 150000,
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
    })

    assert.ok(result.isErr, 'Expected error on tag name collision')

    const tagCountAfter = await db.select({ count: sql<number>`count(*)` }).from(tag)
    const recurringCountAfter = await db.select({ count: sql<number>`count(*)` }).from(recurring)
    assert.strictEqual(
      Number(tagCountAfter[0]?.count),
      Number(tagCountBefore[0]?.count),
      'tag count should be unchanged',
    )
    assert.strictEqual(
      Number(recurringCountAfter[0]?.count),
      Number(recurringCountBefore[0]?.count),
      'recurring count should be unchanged',
    )
  })

  it('leaves no new category rows when a new category name collides mid-batch', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-existing', 'housing')
    await seedRecurring(db, 'rec-1', 'cat-existing', [])

    const catCountBefore = await db.select({ count: sql<number>`count(*)` }).from(category)

    const result = await updateManyAndRecurring(db, {
      id: 'rec-1',
      newCategoryName: 'housing',
      existingCategoryId: null,
      newTagNames: [],
      existingTagIds: [],
      description: 'Monthly rent',
      amountCents: 150000,
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
    })

    assert.ok(result.isErr, 'Expected error on category name collision')

    const catCountAfter = await db.select({ count: sql<number>`count(*)` }).from(category)
    assert.strictEqual(
      Number(catCountAfter[0]?.count),
      Number(catCountBefore[0]?.count),
      'category count should be unchanged',
    )
  })
})

// ---------------------------------------------------------------------------
// 3. Pre-existing attachments survive a no-op edit
// ---------------------------------------------------------------------------

describe('updateRecurringWithTags — pre-existing attachments survive no-op edit (Task 28)', () => {
  it('re-saving the same tagIds leaves all attachments intact', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'tag-food', 'food')
    await seedTag(db, 'tag-gift', 'gift')
    await seedRecurring(db, 'rec-1', 'cat-1', ['tag-food', 'tag-gift'])

    const result = await updateRecurringWithTags(db, {
      id: 'rec-1',
      description: 'Monthly rent',
      amountCents: 150000,
      categoryId: 'cat-1',
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
      tagIds: ['tag-food', 'tag-gift'],
    })

    assert.ok(result.isOk, `Expected ok; got ${JSON.stringify(result)}`)

    const links = await db.select().from(recurringTag).where(sql`recurringId = 'rec-1'`)
    const linkedTagIds = links.map((l) => l.tagId).sort()
    assert.deepStrictEqual(linkedTagIds, ['tag-food', 'tag-gift'])
  })

  it('re-saving with zero tagIds removes all attachments', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'tag-food', 'food')
    await seedRecurring(db, 'rec-1', 'cat-1', ['tag-food'])

    const result = await updateRecurringWithTags(db, {
      id: 'rec-1',
      description: 'Monthly rent',
      amountCents: 150000,
      categoryId: 'cat-1',
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
      tagIds: [],
    })

    assert.ok(result.isOk, `Expected ok; got ${JSON.stringify(result)}`)

    const links = await db.select().from(recurringTag).where(sql`recurringId = 'rec-1'`)
    assert.strictEqual(links.length, 0, 'All tag links should be removed')
  })
})

// ---------------------------------------------------------------------------
// 4. Toggling chips off — detaches corresponding tags atomically on edit
// ---------------------------------------------------------------------------

describe('updateRecurringWithTags — chip-off detaches tags atomically (Task 28)', () => {
  it('supplying a subset of existing tagIds detaches the omitted tags', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'tag-food', 'food')
    await seedTag(db, 'tag-gift', 'gift')
    await seedTag(db, 'tag-lego', 'lego')
    await seedRecurring(db, 'rec-1', 'cat-1', ['tag-food', 'tag-gift', 'tag-lego'])

    const result = await updateRecurringWithTags(db, {
      id: 'rec-1',
      description: 'Monthly rent',
      amountCents: 150000,
      categoryId: 'cat-1',
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
      tagIds: ['tag-gift'],
    })

    assert.ok(result.isOk, `Expected ok; got ${JSON.stringify(result)}`)

    const links = await db.select().from(recurringTag).where(sql`recurringId = 'rec-1'`)
    const linkedTagIds = links.map((l) => l.tagId)
    assert.deepStrictEqual(linkedTagIds, ['tag-gift'], 'Only gift should remain attached')
  })

  it('updateManyAndRecurring with empty existingTagIds removes all pre-existing links', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'tag-food', 'food')
    await seedTag(db, 'tag-gift', 'gift')
    await seedRecurring(db, 'rec-1', 'cat-1', ['tag-food', 'tag-gift'])

    const result = await updateManyAndRecurring(db, {
      id: 'rec-1',
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: ['transport'],
      existingTagIds: [],
      description: 'Monthly rent updated',
      amountCents: 200000,
      recurrence: 'monthly',
      anchorDate: '2026-02-01',
    })

    assert.ok(result.isOk, `Expected ok; got ${JSON.stringify(result)}`)

    const links = await db.select().from(recurringTag).where(sql`recurringId = 'rec-1'`)
    assert.strictEqual(links.length, 1, 'Only the newly created transport tag should be attached')

    const tagRows = await db.select({ name: tag.name }).from(tag).where(sql`id != 'tag-food' AND id != 'tag-gift'`)
    const newTagNames = tagRows.map((r) => r.name)
    assert.ok(newTagNames.includes('transport'), 'New tag transport should be created')
  })

  it('updateManyAndRecurring atomically replaces link set when deduplicating existingTagIds', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'tag-food', 'food')
    await seedTag(db, 'tag-gift', 'gift')
    await seedRecurring(db, 'rec-1', 'cat-1', ['tag-food', 'tag-gift'])

    const result = await updateManyAndRecurring(db, {
      id: 'rec-1',
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: ['metro'],
      existingTagIds: ['tag-gift', 'tag-gift'],
      description: 'Monthly rent',
      amountCents: 150000,
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
    })

    assert.ok(result.isOk, `Expected ok; got ${JSON.stringify(result)}`)

    const links = await db.select().from(recurringTag).where(sql`recurringId = 'rec-1'`)
    const linkedTagIds = links.map((l) => l.tagId).sort()
    assert.strictEqual(linkedTagIds.length, 2, 'Deduped existingTagIds + new tag = 2 links')
    assert.ok(linkedTagIds.includes('tag-gift'), 'gift should remain')
    assert.ok(!linkedTagIds.includes('tag-food'), 'food should be detached')
  })
})
