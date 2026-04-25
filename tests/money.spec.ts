// ====================================
// Tests for money.ts
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'node:test'
import assert from 'node:assert'

import { formatCents, parseAmount } from '../src/lib/money'

describe('formatCents', () => {
  it('formats 0 as 0.00', () => {
    assert.strictEqual(formatCents(0), '0.00')
  })

  it('formats 1 as 0.01', () => {
    assert.strictEqual(formatCents(1), '0.01')
  })

  it('formats 99 as 0.99', () => {
    assert.strictEqual(formatCents(99), '0.99')
  })

  it('formats 100 as 1.00', () => {
    assert.strictEqual(formatCents(100), '1.00')
  })

  it('formats 12345 as 123.45', () => {
    assert.strictEqual(formatCents(12345), '123.45')
  })

  it('formats 123456 as 1,234.56', () => {
    assert.strictEqual(formatCents(123456), '1,234.56')
  })

  it('formats 100000000 as 1,000,000.00', () => {
    assert.strictEqual(formatCents(100000000), '1,000,000.00')
  })
})

describe('parseAmount', () => {
  const expectOk = (input: string, cents: number) => {
    const r = parseAmount(input)
    assert.strictEqual(r.isOk, true, `expected ok for ${JSON.stringify(input)}`)
    if (r.isOk) {
      assert.strictEqual(r.value, cents)
    }
  }

  const expectErr = (input: string) => {
    const r = parseAmount(input)
    assert.strictEqual(r.isErr, true, `expected err for ${JSON.stringify(input)}`)
    if (r.isErr) {
      assert.ok(typeof r.error === 'string' && r.error.length > 0)
    }
  }

  it('parses 1234.56 as 123456 cents', () => {
    expectOk('1234.56', 123456)
  })

  it('parses 1,234.56 as 123456 cents', () => {
    expectOk('1,234.56', 123456)
  })

  it('parses 1234 as 123400 cents', () => {
    expectOk('1234', 123400)
  })

  it('parses .50 as 50 cents', () => {
    expectOk('.50', 50)
  })

  it('parses 0.5 as 50 cents (one decimal place is fine)', () => {
    expectOk('0.5', 50)
  })

  it('tolerates leading and trailing whitespace', () => {
    expectOk('  1,234.56  ', 123456)
    expectOk('\t12.34\n', 1234)
  })

  it('parses 1,000,000.00 as 100000000 cents', () => {
    expectOk('1,000,000.00', 100000000)
  })

  it('rejects malformed comma placement', () => {
    expectErr('1,23.45')
    expectErr(',123')
    expectErr('12,3456')
    expectErr('1,2345')
    expectErr('1,,234')
  })

  it('rejects zero', () => {
    expectErr('0')
    expectErr('0.00')
    expectErr('0.0')
    expectErr('.00')
  })

  it('rejects negatives', () => {
    expectErr('-1')
    expectErr('-1.50')
    expectErr('-0.01')
  })

  it('rejects more than two decimal places', () => {
    expectErr('1.234')
    expectErr('0.001')
    expectErr('1,234.567')
  })

  it('rejects non-numeric input', () => {
    expectErr('abc')
    expectErr('12abc')
    expectErr('$1.00')
    expectErr('1.2.3')
  })

  it('rejects empty string', () => {
    expectErr('')
    expectErr('   ')
  })
})
