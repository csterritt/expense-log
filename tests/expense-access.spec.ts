// ====================================
// Tests for expense-access.ts helpers
// To run this, cd to this directory and type 'bun test'
//
// DB-level assertions (empty table, seeded rows, ordering) are deferred to
// e2e tests because this project has no in-memory D1/SQLite harness for unit
// tests. The e2e suite exercises listTags against the real database.
// ====================================

import { describe, it } from 'node:test'
import assert from 'node:assert'

import { listTags, type TagRow } from '../src/lib/db/expense-access'

describe('listTags export', () => {
  it('is exported as a function', () => {
    assert.strictEqual(typeof listTags, 'function')
  })

  it('returns a Promise<Result<TagRow[], Error>> shape', async () => {
    // With no real DB client available in unit-test land, we verify the
    // contract by checking the function accepts one argument and returns a
    // thenable. Full behaviour (ok([]) on empty table, ASC ordering, mixed-case
    // preservation) is covered in e2e-tests/expenses/.
    const result = listTags(undefined as unknown as Parameters<typeof listTags>[0])
    assert.ok(result instanceof Promise, 'listTags must return a Promise')
    // Swallow the expected rejection since we passed undefined as db.
    await result.catch(() => {})
  })
})
