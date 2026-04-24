// ====================================
// Tests for money.ts
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'node:test'
import assert from 'node:assert'

import { formatCents } from '../src/lib/money'

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
