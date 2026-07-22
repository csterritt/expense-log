// ====================================
// Tests for src/lib/submission-idempotency.ts
//
// Integration coverage for the `withIdempotency` helper (Issue 19):
//   (a) a fresh key runs `run` exactly once, persists its outcome, and
//       returns that outcome;
//   (b) replaying the same key returns the stored outcome and performs no
//       second write (target row count unchanged, `run` not re-invoked);
//   (c) a `run` that signals validation failure records no ledger row and
//       leaves the key resubmittable;
//   (d) an absent or malformed `key` runs `run` exactly once with no dedupe
//       and records no ledger row.
//
// To run: cd to the project root and run `bun test tests`.
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'
import { Result } from 'true-myth'
import { ulid } from 'ulid'

import { expense, submissionKey } from '../src/db/schema'
import { withIdempotency, type SubmissionOutcome } from '../src/lib/submission-idempotency'
import { createTestDb, seedCategory, seedUser, type TestDb } from './helpers/test-db'

const USER_ID = 'user-1'
const CATEGORY_ID = 'cat-1'

const countExpenses = async (db: TestDb): Promise<number> => {
  const rows = await db.select({ id: expense.id }).from(expense)
  return rows.length
}

const countLedgerRows = async (db: TestDb): Promise<number> => {
  const rows = await db.select({ key: submissionKey.key }).from(submissionKey)
  return rows.length
}

// Build a `run` that inserts one expense row and returns a success outcome.
// Tracks how many times it was invoked via the returned `calls` accessor.
const makeInsertingRun = (db: TestDb, outcome: SubmissionOutcome) => {
  let calls = 0
  const run = async (): Promise<Result<SubmissionOutcome, Error>> => {
    calls += 1
    const now = new Date()
    await db.insert(expense).values({
      id: ulid(),
      description: 'coffee',
      amountCents: 500,
      categoryId: CATEGORY_ID,
      date: '2024-01-01',
      createdAt: now,
      updatedAt: now,
    })
    return Result.ok(outcome)
  }
  return {
    run,
    getCalls: () => calls,
  }
}

const seedBase = async (): Promise<TestDb> => {
  const db = await createTestDb()
  await seedUser(db, USER_ID)
  await seedCategory(db, CATEGORY_ID, 'food')
  return db
}

describe('withIdempotency', () => {
  it('(a) a fresh key runs run once, persists the outcome, and returns it', async () => {
    const db = await seedBase()
    const outcome: SubmissionOutcome = { path: '/expenses', message: 'Expense added.' }
    const { run, getCalls } = makeInsertingRun(db, outcome)
    const key = ulid()

    const result = await withIdempotency(db, { key, userId: USER_ID, run })

    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, outcome)
    }
    assert.strictEqual(getCalls(), 1)
    assert.strictEqual(await countExpenses(db), 1)
    assert.strictEqual(await countLedgerRows(db), 1)
  })

  it('(b) replaying the same key returns the stored outcome without a second write', async () => {
    const db = await seedBase()
    const outcome: SubmissionOutcome = { path: '/expenses', message: 'Expense added.' }
    const first = makeInsertingRun(db, outcome)
    const key = ulid()

    const firstResult = await withIdempotency(db, { key, userId: USER_ID, run: first.run })
    assert.strictEqual(firstResult.isOk, true)
    assert.strictEqual(await countExpenses(db), 1)

    // Replay with the same key using a fresh run whose invocation we track.
    const second = makeInsertingRun(db, { path: '/somewhere-else', message: 'Should not run.' })
    const secondResult = await withIdempotency(db, { key, userId: USER_ID, run: second.run })

    assert.strictEqual(secondResult.isOk, true)
    if (secondResult.isOk) {
      // Returns the ORIGINAL stored outcome, not the replay run's outcome.
      assert.deepStrictEqual(secondResult.value, outcome)
    }
    assert.strictEqual(second.getCalls(), 0)
    assert.strictEqual(await countExpenses(db), 1)
    assert.strictEqual(await countLedgerRows(db), 1)
  })

  it('(c) a run that signals validation failure records no ledger row and stays resubmittable', async () => {
    const db = await seedBase()
    const key = ulid()

    let failCalls = 0
    const failingRun = async (): Promise<Result<SubmissionOutcome, Error>> => {
      failCalls += 1
      return Result.err(new Error('validation failed'))
    }

    const failResult = await withIdempotency(db, { key, userId: USER_ID, run: failingRun })
    assert.strictEqual(failResult.isErr, true)
    assert.strictEqual(failCalls, 1)
    assert.strictEqual(await countLedgerRows(db), 0)
    assert.strictEqual(await countExpenses(db), 0)

    // Same key may be resubmitted and now succeeds, recording a row.
    const outcome: SubmissionOutcome = { path: '/expenses', message: 'Expense added.' }
    const { run, getCalls } = makeInsertingRun(db, outcome)
    const retryResult = await withIdempotency(db, { key, userId: USER_ID, run })

    assert.strictEqual(retryResult.isOk, true)
    if (retryResult.isOk) {
      assert.deepStrictEqual(retryResult.value, outcome)
    }
    assert.strictEqual(getCalls(), 1)
    assert.strictEqual(await countExpenses(db), 1)
    assert.strictEqual(await countLedgerRows(db), 1)
  })

  it('(d) an absent or malformed key runs run once with no dedupe and no ledger row', async () => {
    const db = await seedBase()
    const outcome: SubmissionOutcome = { path: '/expenses', message: 'Expense added.' }

    // Absent key.
    const absent = makeInsertingRun(db, outcome)
    const absentResult = await withIdempotency(db, { key: '', userId: USER_ID, run: absent.run })
    assert.strictEqual(absentResult.isOk, true)
    assert.strictEqual(absent.getCalls(), 1)

    // Malformed key (not a ULID).
    const malformed = makeInsertingRun(db, outcome)
    const malformedResult = await withIdempotency(db, {
      key: 'not-a-ulid!',
      userId: USER_ID,
      run: malformed.run,
    })
    assert.strictEqual(malformedResult.isOk, true)
    assert.strictEqual(malformed.getCalls(), 1)

    // Both writes went through, but nothing was recorded in the ledger.
    assert.strictEqual(await countExpenses(db), 2)
    assert.strictEqual(await countLedgerRows(db), 0)
  })
})
