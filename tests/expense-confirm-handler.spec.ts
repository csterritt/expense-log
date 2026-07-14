// ====================================
// Tests for expense confirmation handler hardening (Task 22 RED)
//
// Covers:
//   - Schema/migration assertion: tag.name and category.name have global unique
//     lowercase indexes (backed by DB-level constraint, not app-only logic)
//   - HMAC-signature signing utilities: signConfirmationPayload /
//     verifyConfirmationPayload from src/lib/confirmation-hmac.ts
//   - createOrReuseTag and createOrReuseCategory helpers from
//     src/lib/db/confirm-helpers.ts: race-tolerant reuse on name collision
//   - createManyAndExpense atomicity: no partial rows on unique-constraint error
//
// Run: cd to project root and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'
import { eq, sql } from 'drizzle-orm'

import { category, expense, tag, schema } from '../src/db/schema'
import {
  createManyAndExpense,
} from '../src/lib/db/expense-access'
import type { DrizzleClient } from '../src/local-types'
import { createTestDb, seedCategory, seedTag } from './helpers/test-db'

const seedCategory = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(category).values({ id, name, createdAt: now, updatedAt: now })
// ---------------------------------------------------------------------------
}
// 1. Schema assertions — tag.name and category.name have lowercase unique indexes
// ---------------------------------------------------------------------------

describe('schema unique-index assertions (Task 22)', () => {
  it('tag table enforces case-insensitive unique constraint on name via DB index', async () => {
    const db = await createTestDb()
    const now = new Date()
    await db.insert(tag).values({ id: 'tag-1', name: 'food', createdAt: now, updatedAt: now })
    await assert.rejects(
      () => db.insert(tag).values({ id: 'tag-2', name: 'Food', createdAt: now, updatedAt: now }),
      /unique|constraint/i,
      'Expected DB to reject a case-insensitive tag name duplicate',
    )
  })

  it('category table enforces case-insensitive unique constraint on name via DB index', async () => {
    const db = await createTestDb()
    const now = new Date()
    await db.insert(category).values({ id: 'cat-1', name: 'groceries', createdAt: now, updatedAt: now })
    await assert.rejects(
      () => db.insert(category).values({ id: 'cat-2', name: 'Groceries', createdAt: now, updatedAt: now }),
      /unique|constraint/i,
      'Expected DB to reject a case-insensitive category name duplicate',
    )
  })

  it('drizzle/meta snapshot contains category_name_lower_unique index', async () => {
    const fs = (await eval("import('node:fs')")) as typeof import('node:fs')
    const latestSnapshot = fs.readdirSync('drizzle/meta')
      .filter((f: string) => f.endsWith('_snapshot.json'))
      .sort()
      .at(-1)
    assert.ok(latestSnapshot, 'Expected at least one drizzle/meta snapshot')
    const snapshot = JSON.parse(fs.readFileSync(`drizzle/meta/${latestSnapshot}`, 'utf8'))
    const categoryTable = snapshot?.tables?.category
    assert.ok(categoryTable, 'Expected category table in snapshot')
    const indexes = categoryTable?.indexes ?? {}
    assert.ok(
      Object.keys(indexes).includes('category_name_lower_unique'),
      `Expected category_name_lower_unique index in snapshot; got: ${JSON.stringify(Object.keys(indexes))}`,
    )
    assert.strictEqual(indexes['category_name_lower_unique']?.isUnique, true)
  })

  it('drizzle/meta snapshot contains tag_name_lower_unique index', async () => {
    const fs = (await eval("import('node:fs')")) as typeof import('node:fs')
    const latestSnapshot = fs.readdirSync('drizzle/meta')
      .filter((f: string) => f.endsWith('_snapshot.json'))
      .sort()
      .at(-1)
    assert.ok(latestSnapshot, 'Expected at least one drizzle/meta snapshot')
    const snapshot = JSON.parse(fs.readFileSync(`drizzle/meta/${latestSnapshot}`, 'utf8'))
    const tagTable = snapshot?.tables?.tag
    assert.ok(tagTable, 'Expected tag table in snapshot')
    const indexes = tagTable?.indexes ?? {}
    assert.ok(
      Object.keys(indexes).includes('tag_name_lower_unique'),
      `Expected tag_name_lower_unique index in snapshot; got: ${JSON.stringify(Object.keys(indexes))}`,
    )
    assert.strictEqual(indexes['tag_name_lower_unique']?.isUnique, true)
  })
})

// ---------------------------------------------------------------------------
// 2. HMAC signing utilities
// ---------------------------------------------------------------------------

describe('signConfirmationPayload / verifyConfirmationPayload (Task 22)', () => {
  const TEST_KEY = 'test-signing-key-32-chars-min!!'

  const basePayload: ConfirmationPayload = {
    description: 'Lunch',
    amount: '12.00',
    date: '2024-06-01',
    category: 'food',
    tagIds: ['01JFAKETAGID0000000000000A'],
    newTags: 'coffee',
  }

  const loadHmac = async () => {
    const mod = await import('../src/lib/confirmation-hmac')
    return mod as {
      signConfirmationPayload: (p: ConfirmationPayload, key: string) => Promise<string>
      verifyConfirmationPayload: (p: ConfirmationPayload, sig: string, key: string | undefined) => Promise<boolean>
    }
  }

  it('signs a payload and successfully verifies the same payload', async () => {
    const { signConfirmationPayload, verifyConfirmationPayload } = await loadHmac()
    const signature = await signConfirmationPayload(basePayload, TEST_KEY)
    assert.strictEqual(typeof signature, 'string')
    assert.ok(signature.length > 10, 'Expected a non-trivial signature string')

    const isValid = await verifyConfirmationPayload(basePayload, signature, TEST_KEY)
    assert.strictEqual(isValid, true)
  })

  it('rejects verification when the description is tampered', async () => {
    const { signConfirmationPayload, verifyConfirmationPayload } = await loadHmac()
    const signature = await signConfirmationPayload(basePayload, TEST_KEY)
    const tampered: ConfirmationPayload = { ...basePayload, description: 'Dinner' }
    const isValid = await verifyConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when the amount is tampered', async () => {
    const { signConfirmationPayload, verifyConfirmationPayload } = await loadHmac()
    const signature = await signConfirmationPayload(basePayload, TEST_KEY)
    const tampered: ConfirmationPayload = { ...basePayload, amount: '20.00' }
    const isValid = await verifyConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when a tagId is injected', async () => {
    const { signConfirmationPayload, verifyConfirmationPayload } = await loadHmac()
    const signature = await signConfirmationPayload(basePayload, TEST_KEY)
    const tampered: ConfirmationPayload = {
      ...basePayload,
      tagIds: [...basePayload.tagIds, '01JFAKETAGID0000000000000B'],
    }
    const isValid = await verifyConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when the category is swapped', async () => {
    const { signConfirmationPayload, verifyConfirmationPayload } = await loadHmac()
    const signature = await signConfirmationPayload(basePayload, TEST_KEY)
    const tampered: ConfirmationPayload = { ...basePayload, category: 'other' }
    const isValid = await verifyConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('fails closed when the signing key is absent (undefined)', async () => {
    const { verifyConfirmationPayload } = await loadHmac()
    const isValid = await verifyConfirmationPayload(basePayload, 'any-sig', undefined)
    assert.strictEqual(isValid, false)
  })
})

// ---------------------------------------------------------------------------
// 3. createOrReuseTag — race-tolerant reuse helper
// ---------------------------------------------------------------------------

describe('createOrReuseTag (Task 22)', () => {
  const loadHelpers = async () => {
    const mod = await import('../src/lib/db/confirm-helpers')
    return mod as {
      createOrReuseTag: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
      createOrReuseCategory: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
    }
  }

  it('creates a new tag and returns its id when the name does not exist', async () => {
    const { createOrReuseTag } = await loadHelpers()
    const db = await createTestDb()
    const result = await createOrReuseTag(db, 'travel')
    assert.ok(result.isOk, `expected ok; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(typeof result.value.id, 'string')
      assert.ok(result.value.id.length > 0)
      assert.strictEqual(result.value.name, 'travel')
    }
    const rows = await db.select({ name: tag.name }).from(tag)
    assert.strictEqual(rows.length, 1)
    assert.strictEqual(rows[0]?.name, 'travel')
  })

  it('silently reuses an existing tag with the same name (race-tolerant)', async () => {
    const { createOrReuseTag } = await loadHelpers()
    const db = await createTestDb()
    await seedTag(db, 'existing-id', 'travel')

    const result = await createOrReuseTag(db, 'travel')
    assert.ok(result.isOk, `expected ok on race-reuse; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.id, 'existing-id')
      assert.strictEqual(result.value.name, 'travel')
    }
    const rows = await db.select({ name: tag.name }).from(tag)
    assert.strictEqual(rows.length, 1)
  })

  it('reuse is case-insensitive: "Travel" reuses existing "travel"', async () => {
    const { createOrReuseTag } = await loadHelpers()
    const db = await createTestDb()
    await seedTag(db, 'existing-id', 'travel')

    const result = await createOrReuseTag(db, 'Travel')
    assert.ok(result.isOk, `expected ok; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.id, 'existing-id')
    }
  })
})

// ---------------------------------------------------------------------------
// 4. createOrReuseCategory — race-tolerant reuse helper
// ---------------------------------------------------------------------------

describe('createOrReuseCategory (Task 22)', () => {
  const loadHelpers = async () => {
    const mod = await import('../src/lib/db/confirm-helpers')
    return mod as {
      createOrReuseTag: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
      createOrReuseCategory: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
    }
  }

  it('creates a new category and returns its id when the name does not exist', async () => {
    const { createOrReuseCategory } = await loadHelpers()
    const db = await createTestDb()
    const result = await createOrReuseCategory(db, 'groceries')
    assert.ok(result.isOk, `expected ok; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(typeof result.value.id, 'string')
      assert.ok(result.value.id.length > 0)
      assert.strictEqual(result.value.name, 'groceries')
    }
    const rows = await db.select({ name: category.name }).from(category)
    assert.strictEqual(rows.length, 1)
  })

  it('silently reuses an existing category with the same name (race-tolerant)', async () => {
    const { createOrReuseCategory } = await loadHelpers()
    const db = await createTestDb()
    await seedCategory(db, 'existing-cat-id', 'groceries')

    const result = await createOrReuseCategory(db, 'groceries')
    assert.ok(result.isOk, `expected ok on race-reuse; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.id, 'existing-cat-id')
      assert.strictEqual(result.value.name, 'groceries')
    }
    const rows = await db.select({ name: category.name }).from(category)
    assert.strictEqual(rows.length, 1)
  })

  it('reuse is case-insensitive: "Groceries" reuses existing "groceries"', async () => {
    const { createOrReuseCategory } = await loadHelpers()
    const db = await createTestDb()
    await seedCategory(db, 'existing-cat-id', 'groceries')

    const result = await createOrReuseCategory(db, 'Groceries')
    assert.ok(result.isOk, `expected ok; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.id, 'existing-cat-id')
    }
  })
})

// ---------------------------------------------------------------------------
// 5. createManyAndExpense atomicity — no partial rows on constraint failure
// ---------------------------------------------------------------------------

describe('createManyAndExpense atomicity (Task 22)', () => {
  it('leaves no tag or expense rows when a tag name collides mid-batch', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedTag(db, 'existing-tag', 'coffee')

    const countBefore = await db.select({ count: sql<number>`count(*)` }).from(tag)
    const expBefore = await db.select({ count: sql<number>`count(*)` }).from(expense)

    const result = await createManyAndExpense(db, {
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: ['coffee'],
      existingTagIds: [],
      date: '2024-06-01',
      description: 'Lunch',
      amountCents: 1200,
    })

    assert.ok(result.isErr, 'Expected error on name collision')

    const countAfter = await db.select({ count: sql<number>`count(*)` }).from(tag)
    const expAfter = await db.select({ count: sql<number>`count(*)` }).from(expense)
    assert.strictEqual(Number(countAfter[0]?.count), Number(countBefore[0]?.count), 'tag count should be unchanged')
    assert.strictEqual(Number(expAfter[0]?.count), Number(expBefore[0]?.count), 'expense count should be unchanged')
  })

  it('leaves no category or expense rows when a category name collides mid-batch', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-existing', 'food')

    const catBefore = await db.select({ count: sql<number>`count(*)` }).from(category)
    const expBefore = await db.select({ count: sql<number>`count(*)` }).from(expense)

    const result = await createManyAndExpense(db, {
      newCategoryName: 'food',
      existingCategoryId: null,
      newTagNames: [],
      existingTagIds: [],
      date: '2024-06-01',
      description: 'Lunch',
      amountCents: 1200,
    })

    assert.ok(result.isErr, 'Expected error on category name collision')

    const catAfter = await db.select({ count: sql<number>`count(*)` }).from(category)
    const expAfter = await db.select({ count: sql<number>`count(*)` }).from(expense)
    assert.strictEqual(Number(catAfter[0]?.count), Number(catBefore[0]?.count), 'category count should be unchanged')
    assert.strictEqual(Number(expAfter[0]?.count), Number(expBefore[0]?.count), 'expense count should be unchanged')
  })
})

