// ====================================
// Tests for recurring-create confirmation handler hardening (Task 25 RED)
//
// Mirrors expense-confirm-handler.spec.ts (Task 22) for the recurring-create
// confirmation route. Covers:
//   - RecurringConfirmationPayload HMAC signing utilities: sign/verify with
//     recurrence + anchorDate fields instead of date
//   - Tamper rejection: modified amount, description, injected tagId, swapped
//     category, modified recurrence, modified anchorDate all fail verification
//   - createOrReuseTag and createOrReuseCategory helpers (shared with expense,
//     already tested — re-asserted here for the recurring confirm path)
//   - createManyAndRecurring atomicity: no partial rows on unique-constraint
//     error (tag collision, category collision)
//
// Run: cd to project root and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'
import { sql } from 'drizzle-orm'

import { category, tag, recurring, recurringTag, schema } from '../src/db/schema'
import { createManyAndRecurring } from '../src/lib/db/expense-access'
import type { DrizzleClient } from '../src/local-types'
import { createTestDb, seedCategory, seedTag } from './helpers/test-db'


// ---------------------------------------------------------------------------
// 1. HMAC signing utilities for recurring confirmation payloads
// ---------------------------------------------------------------------------

describe('signRecurringConfirmationPayload / verifyRecurringConfirmationPayload (Task 25)', () => {
  const TEST_KEY = 'test-signing-key-32-chars-min!!'

  const basePayload: RecurringConfirmationPayload = {
    description: 'Monthly rent',
    amount: '1500.00',
    recurrence: 'monthly',
    anchorDate: '2026-01-01',
    category: 'housing',
    tagIds: ['01JFAKETAGID0000000000000A'],
    newTags: 'utilities',
  }

  const loadHmac = async () => {
    const mod = await import('../src/lib/confirmation-hmac')
    return mod as {
      signRecurringConfirmationPayload: (p: RecurringConfirmationPayload, key: string) => Promise<string>
      verifyRecurringConfirmationPayload: (p: RecurringConfirmationPayload, sig: string, key: string | undefined) => Promise<boolean>
    }
  }

  it('signs a recurring payload and successfully verifies the same payload', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    assert.strictEqual(typeof signature, 'string')
    assert.ok(signature.length > 10, 'Expected a non-trivial signature string')

    const isValid = await verifyRecurringConfirmationPayload(basePayload, signature, TEST_KEY)
    assert.strictEqual(isValid, true)
  })

  it('rejects verification when the description is tampered', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered: RecurringConfirmationPayload = { ...basePayload, description: 'Weekly coffee' }
    const isValid = await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when the amount is tampered', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered: RecurringConfirmationPayload = { ...basePayload, amount: '2000.00' }
    const isValid = await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when a tagId is injected', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered: RecurringConfirmationPayload = {
      ...basePayload,
      tagIds: [...basePayload.tagIds, '01JFAKETAGID0000000000000B'],
    }
    const isValid = await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when the category is swapped', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered: RecurringConfirmationPayload = { ...basePayload, category: 'transport' }
    const isValid = await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when the recurrence is tampered', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered: RecurringConfirmationPayload = { ...basePayload, recurrence: 'weekly' }
    const isValid = await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('rejects verification when the anchorDate is tampered', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const signature = await signRecurringConfirmationPayload(basePayload, TEST_KEY)
    const tampered: RecurringConfirmationPayload = { ...basePayload, anchorDate: '2026-06-01' }
    const isValid = await verifyRecurringConfirmationPayload(tampered, signature, TEST_KEY)
    assert.strictEqual(isValid, false)
  })

  it('fails closed when the signing key is absent (undefined)', async () => {
    const { verifyRecurringConfirmationPayload } = await loadHmac()
    const isValid = await verifyRecurringConfirmationPayload(basePayload, 'any-sig', undefined)
    assert.strictEqual(isValid, false)
  })

  it('tag ordering is stable — signing with reordered tagIds verifies the same', async () => {
    const { signRecurringConfirmationPayload, verifyRecurringConfirmationPayload } = await loadHmac()
    const payloadA: RecurringConfirmationPayload = {
      ...basePayload,
      tagIds: ['01JFAKETAGID0000000000000B', '01JFAKETAGID0000000000000A'],
    }
    const payloadB: RecurringConfirmationPayload = {
      ...basePayload,
      tagIds: ['01JFAKETAGID0000000000000A', '01JFAKETAGID0000000000000B'],
    }
    const sig = await signRecurringConfirmationPayload(payloadA, TEST_KEY)
    const isValid = await verifyRecurringConfirmationPayload(payloadB, sig, TEST_KEY)
    assert.strictEqual(isValid, true, 'tag order should not affect signature')
  })
})

// ---------------------------------------------------------------------------
// 2. createManyAndRecurring atomicity — no partial rows on constraint failure
// ---------------------------------------------------------------------------

describe('createManyAndRecurring atomicity (Task 25)', () => {
  it('leaves no tag or recurring rows when a tag name collides mid-batch', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'existing-tag', 'utilities')

    const tagCountBefore = await db.select({ count: sql<number>`count(*)` }).from(tag)
    const recurringCountBefore = await db.select({ count: sql<number>`count(*)` }).from(recurring)

    const result = await createManyAndRecurring(db, {
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
    assert.strictEqual(Number(tagCountAfter[0]?.count), Number(tagCountBefore[0]?.count), 'tag count should be unchanged')
    assert.strictEqual(Number(recurringCountAfter[0]?.count), Number(recurringCountBefore[0]?.count), 'recurring count should be unchanged')
  })

  it('leaves no category or recurring rows when a category name collides mid-batch', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-existing', 'housing')

    const catCountBefore = await db.select({ count: sql<number>`count(*)` }).from(category)
    const recurringCountBefore = await db.select({ count: sql<number>`count(*)` }).from(recurring)

    const result = await createManyAndRecurring(db, {
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
    const recurringCountAfter = await db.select({ count: sql<number>`count(*)` }).from(recurring)
    assert.strictEqual(Number(catCountAfter[0]?.count), Number(catCountBefore[0]?.count), 'category count should be unchanged')
    assert.strictEqual(Number(recurringCountAfter[0]?.count), Number(recurringCountBefore[0]?.count), 'recurring count should be unchanged')
  })

  it('creates recurring template with existing category and tags on success', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'housing')
    await seedTag(db, 'tag-1', 'utilities')

    const result = await createManyAndRecurring(db, {
      newCategoryName: null,
      existingCategoryId: 'cat-1',
      newTagNames: [],
      existingTagIds: ['tag-1'],
      description: 'Monthly rent',
      amountCents: 150000,
      recurrence: 'monthly',
      anchorDate: '2026-01-01',
    })

    assert.ok(result.isOk, `Expected success; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(typeof result.value.recurringId, 'string')
      assert.ok(result.value.recurringId.length > 0)
      assert.strictEqual(result.value.categoryId, 'cat-1')
    }

    const recurringRows = await db.select().from(recurring)
    assert.strictEqual(recurringRows.length, 1)
    assert.strictEqual(recurringRows[0]?.recurrence, 'monthly')
    assert.strictEqual(recurringRows[0]?.anchorDate, '2026-01-01')

    const tagLinks = await db.select().from(recurringTag)
    assert.strictEqual(tagLinks.length, 1)
    assert.strictEqual(tagLinks[0]?.tagId, 'tag-1')
  })

  it('creates new category and new tags atomically with recurring template', async () => {
    const db = await createTestDb()

    const result = await createManyAndRecurring(db, {
      newCategoryName: 'transport',
      existingCategoryId: null,
      newTagNames: ['bus', 'metro'],
      existingTagIds: [],
      description: 'Monthly transit pass',
      amountCents: 9000,
      recurrence: 'monthly',
      anchorDate: '2026-01-15',
    })

    assert.ok(result.isOk, `Expected success; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.createdTagIds.length, 2)
    }

    const categoryRows = await db.select({ name: category.name }).from(category)
    assert.strictEqual(categoryRows.length, 1)
    assert.strictEqual(categoryRows[0]?.name, 'transport')

    const tagRows = await db.select({ name: tag.name }).from(tag)
    assert.strictEqual(tagRows.length, 2)
    const tagNames = tagRows.map((r) => r.name).sort()
    assert.deepStrictEqual(tagNames, ['bus', 'metro'])

    const recurringRows = await db.select().from(recurring)
    assert.strictEqual(recurringRows.length, 1)

    const tagLinks = await db.select().from(recurringTag)
    assert.strictEqual(tagLinks.length, 2)
  })
})

// ---------------------------------------------------------------------------
// 3. createOrReuseTag — race-tolerant reuse (re-asserted for recurring confirm path)
// ---------------------------------------------------------------------------

describe('createOrReuseTag (Task 25 — recurring confirm path)', () => {
  const loadHelpers = async () => {
    const mod = await import('../src/lib/db/confirm-helpers')
    return mod as {
      createOrReuseTag: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
      createOrReuseCategory: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
    }
  }

  it('creates a new tag when no existing tag with that name', async () => {
    const { createOrReuseTag } = await loadHelpers()
    const db = await createTestDb()
    const result = await createOrReuseTag(db, 'housing')
    assert.ok(result.isOk, `expected ok; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(typeof result.value.id, 'string')
      assert.ok(result.value.id.length > 0)
      assert.strictEqual(result.value.name, 'housing')
    }
  })

  it('reuses an existing tag on race-collision', async () => {
    const { createOrReuseTag } = await loadHelpers()
    const db = await createTestDb()
    await seedTag(db, 'tag-existing', 'housing')

    const result = await createOrReuseTag(db, 'housing')
    assert.ok(result.isOk, `expected ok on race-reuse; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.id, 'tag-existing')
    }

    const rows = await db.select({ name: tag.name }).from(tag)
    assert.strictEqual(rows.length, 1)
  })
})

// ---------------------------------------------------------------------------
// 4. createOrReuseCategory — race-tolerant reuse (re-asserted for recurring confirm path)
// ---------------------------------------------------------------------------

describe('createOrReuseCategory (Task 25 — recurring confirm path)', () => {
  const loadHelpers = async () => {
    const mod = await import('../src/lib/db/confirm-helpers')
    return mod as {
      createOrReuseTag: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
      createOrReuseCategory: (db: TestDb, name: string) => Promise<{ isOk: boolean; isErr: boolean; value: { id: string; name: string }; error?: Error }>
    }
  }

  it('creates a new category when no existing category with that name', async () => {
    const { createOrReuseCategory } = await loadHelpers()
    const db = await createTestDb()
    const result = await createOrReuseCategory(db, 'transport')
    assert.ok(result.isOk, `expected ok; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(typeof result.value.id, 'string')
      assert.ok(result.value.id.length > 0)
      assert.strictEqual(result.value.name, 'transport')
    }
  })

  it('reuses an existing category on race-collision', async () => {
    const { createOrReuseCategory } = await loadHelpers()
    const db = await createTestDb()
    await seedCategory(db, 'cat-existing', 'transport')

    const result = await createOrReuseCategory(db, 'transport')
    assert.ok(result.isOk, `expected ok on race-reuse; got ${JSON.stringify(result)}`)
    if (result.isOk) {
      assert.strictEqual(result.value.id, 'cat-existing')
    }

    const rows = await db.select({ name: category.name }).from(category)
    assert.strictEqual(rows.length, 1)
  })
})
