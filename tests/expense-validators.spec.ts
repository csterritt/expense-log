// ====================================
// Tests for expense-validators.ts
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'

import {
  parseExpenseCreate,
  parseNewCategoryName,
  descriptionMax,
  categoryNameMax,
  type FieldErrors,
} from '../src/lib/expense-validators'

const VALID = {
  description: 'Lunch',
  amount: '12.34',
  date: '2024-02-29',
  category: 'Food',
}

const expectOk = (input: typeof VALID, expected: { amountCents: number }) => {
  const r = parseExpenseCreate(input)
  assert.strictEqual(r.isOk, true, `expected ok for ${JSON.stringify(input)}`)
  if (r.isOk) {
    assert.strictEqual(r.value.amountCents, expected.amountCents)
    assert.strictEqual(r.value.description, input.description.trim())
    assert.strictEqual(r.value.date, input.date.trim())
    assert.strictEqual(r.value.category, input.category.trim())
  }
}

const expectFieldErr = (
  input: Partial<typeof VALID>,
  expectedFields: Array<keyof FieldErrors>,
) => {
  const r = parseExpenseCreate({ ...VALID, ...input })
  assert.strictEqual(r.isErr, true, `expected err for ${JSON.stringify(input)}`)
  if (r.isErr) {
    for (const f of expectedFields) {
      assert.ok(
        typeof r.error[f] === 'string' && (r.error[f] as string).length > 0,
        `expected error for field ${f}; got ${JSON.stringify(r.error)}`,
      )
    }
  }
}

describe('parseExpenseCreate', () => {
  describe('description', () => {
    it('accepts a single char', () => {
      expectOk({ ...VALID, description: 'x' }, { amountCents: 1234 })
    })

    it('accepts exactly descriptionMax characters', () => {
      expectOk({ ...VALID, description: 'a'.repeat(descriptionMax) }, { amountCents: 1234 })
    })

    it('rejects empty', () => {
      expectFieldErr({ description: '' }, ['description'])
    })

    it('rejects whitespace-only', () => {
      expectFieldErr({ description: '   ' }, ['description'])
    })

    it('rejects descriptionMax + 1 characters', () => {
      expectFieldErr({ description: 'a'.repeat(descriptionMax + 1) }, ['description'])
    })
  })

  describe('amount', () => {
    it('parses 1234.56 as 123456 cents', () => {
      expectOk({ ...VALID, amount: '1234.56' }, { amountCents: 123456 })
    })

    it('rejects empty', () => {
      expectFieldErr({ amount: '' }, ['amount'])
    })

    it('rejects zero', () => {
      expectFieldErr({ amount: '0' }, ['amount'])
    })

    it('rejects negatives', () => {
      expectFieldErr({ amount: '-5' }, ['amount'])
    })

    it('rejects more than two decimal places', () => {
      expectFieldErr({ amount: '1.234' }, ['amount'])
    })

    it('rejects non-numeric', () => {
      expectFieldErr({ amount: 'abc' }, ['amount'])
    })
  })

  describe('date', () => {
    it('accepts leap day 2024-02-29', () => {
      expectOk({ ...VALID, date: '2024-02-29' }, { amountCents: 1234 })
    })

    it('rejects empty', () => {
      expectFieldErr({ date: '' }, ['date'])
    })

    it('rejects 2025-13-40', () => {
      expectFieldErr({ date: '2025-13-40' }, ['date'])
    })

    it('rejects 2024-04-31', () => {
      expectFieldErr({ date: '2024-04-31' }, ['date'])
    })

    it('rejects malformed shape', () => {
      expectFieldErr({ date: '2024/02/29' }, ['date'])
    })
  })

  describe('category', () => {
    it('accepts a non-empty name', () => {
      expectOk({ ...VALID, category: 'Groceries' }, { amountCents: 1234 })
    })

    it('rejects empty', () => {
      expectFieldErr({ category: '' }, ['category'])
    })

    it('rejects whitespace-only', () => {
      expectFieldErr({ category: '   ' }, ['category'])
    })
  })

  describe('parseNewCategoryName', () => {
    it('accepts a single character', () => {
      const r = parseNewCategoryName('a')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.strictEqual(r.value, 'a')
      }
    })

    it('accepts exactly categoryNameMax characters', () => {
      const r = parseNewCategoryName('a'.repeat(categoryNameMax))
      assert.strictEqual(r.isOk, true)
    })

    it('rejects categoryNameMax + 1 characters', () => {
      const r = parseNewCategoryName('a'.repeat(categoryNameMax + 1))
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.length > 0)
      }
    })

    it('rejects empty input', () => {
      const r = parseNewCategoryName('')
      assert.strictEqual(r.isErr, true)
    })

    it('rejects whitespace-only input', () => {
      const r = parseNewCategoryName('   ')
      assert.strictEqual(r.isErr, true)
    })

    it('trims surrounding whitespace and returns the trimmed value', () => {
      const r = parseNewCategoryName('  Groceries  ')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.strictEqual(r.value, 'Groceries')
      }
    })

    it('preserves case in the trimmed value', () => {
      const r = parseNewCategoryName('Groceries')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.strictEqual(r.value, 'Groceries')
      }
    })
  })

  describe('multi-field failure', () => {
    it('reports errors for every invalid field at once', () => {
      expectFieldErr(
        { description: '', amount: '0', date: '2025-13-40', category: '' },
        ['description', 'amount', 'date', 'category'],
      )
    })

    it('preserves valid fields passing while invalid ones fail', () => {
      const r = parseExpenseCreate({ ...VALID, description: '', amount: '1.234' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.description)
        assert.ok(r.error.amount)
        assert.strictEqual(r.error.date, undefined)
        assert.strictEqual(r.error.category, undefined)
      }
    })
  })
})
