// ====================================
// Tests for src/lib/recurrence.ts
// To run: cd to the project root and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'

import { nextOccurrenceAfter } from '../src/lib/recurrence'

describe('nextOccurrenceAfter', () => {
  describe('input validation', () => {
    it('throws on invalid anchorDate', () => {
      assert.throws(
        () => nextOccurrenceAfter({ recurrence: 'Monthly', anchorDate: 'not-a-date', after: '2024-01-01' }),
        /anchorDate/,
      )
    })

    it('throws on impossible anchorDate (Feb 30)', () => {
      assert.throws(
        () => nextOccurrenceAfter({ recurrence: 'Monthly', anchorDate: '2024-02-30', after: '2024-01-01' }),
        /anchorDate/,
      )
    })

    it('throws on invalid after', () => {
      assert.throws(
        () => nextOccurrenceAfter({ recurrence: 'Monthly', anchorDate: '2024-01-15', after: 'bad' }),
        /after/,
      )
    })

    it('throws on impossible after date (Feb 30)', () => {
      assert.throws(
        () => nextOccurrenceAfter({ recurrence: 'Monthly', anchorDate: '2024-01-15', after: '2024-02-30' }),
        /after/,
      )
    })
  })

  describe('Quarterly and Yearly throw not-implemented', () => {
    it('Quarterly throws', () => {
      assert.throws(
        () => nextOccurrenceAfter({ recurrence: 'Quarterly', anchorDate: '2024-01-15', after: '2024-01-01' }),
        /Not yet implemented/,
      )
    })

    it('Yearly throws', () => {
      assert.throws(
        () => nextOccurrenceAfter({ recurrence: 'Yearly', anchorDate: '2024-01-15', after: '2024-01-01' }),
        /Not yet implemented/,
      )
    })
  })

  describe('Monthly — basic same-month hit', () => {
    it('returns occurrence in same month when anchor day has not yet passed', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        after: '2024-01-14',
      })
      assert.strictEqual(result, '2024-01-15')
    })

    it('advances to next month when anchor day equals after day', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        after: '2024-01-15',
      })
      assert.strictEqual(result, '2024-02-15')
    })

    it('advances to next month when anchor day is before after day', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-10',
        after: '2024-01-20',
      })
      assert.strictEqual(result, '2024-02-10')
    })
  })

  describe('Monthly — year rollover', () => {
    it('rolls over from December to January of next year', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-12-10',
        after: '2024-12-25',
      })
      assert.strictEqual(result, '2025-01-10')
    })

    it('rolls over on the last day of December', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-12-31',
        after: '2024-12-31',
      })
      assert.strictEqual(result, '2025-01-31')
    })
  })

  describe('Monthly — 28th-shift rule (short months)', () => {
    it('anchor 29 in non-leap February → Feb 28', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-29',
        after: '2025-01-31',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('anchor 30 in non-leap February → Feb 28', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-30',
        after: '2025-01-31',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('anchor 31 in non-leap February → Feb 28', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-31',
        after: '2025-01-31',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('anchor 29 in leap-year February → Feb 29', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-29',
        after: '2024-01-31',
      })
      assert.strictEqual(result, '2024-02-29')
    })

    it('anchor 31 in April → Apr 30', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-31',
        after: '2024-03-31',
      })
      assert.strictEqual(result, '2024-04-30')
    })

    it('anchor 31 in June → Jun 30', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-31',
        after: '2024-05-31',
      })
      assert.strictEqual(result, '2024-06-30')
    })
  })

  describe('Monthly — clamped occurrence still after `after`', () => {
    it('returns clamped date in same month when it is strictly after', () => {
      // Feb has 28 days (non-leap). Anchor is 31. After is Feb 27.
      // Clamped day = 28, 2025-02-28 > 2025-02-27 → return same month.
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-31',
        after: '2025-02-27',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('advances when clamped day equals after day', () => {
      // Feb has 28 days (non-leap). Anchor is 31. After is Feb 28.
      // Clamped day = 28, 2025-02-28 is NOT > 2025-02-28 → advance to March.
      const result = nextOccurrenceAfter({
        recurrence: 'Monthly',
        anchorDate: '2024-01-31',
        after: '2025-02-28',
      })
      assert.strictEqual(result, '2025-03-31')
    })
  })
})
