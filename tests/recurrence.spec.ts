// ====================================
// Tests for src/lib/recurrence.ts
// To run: cd to the project root and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'

import { nextOccurrenceAfter, occurrencesToGenerate } from '../src/lib/recurrence'

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

  describe('Quarterly — basic', () => {
    it('returns next quarterly slot when anchor day has not yet passed in the slot month', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-15',
        after: '2024-01-14',
      })
      assert.strictEqual(result, '2024-01-15')
    })

    it('advances to the next quarterly slot when anchor day equals after day', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-15',
        after: '2024-01-15',
      })
      assert.strictEqual(result, '2024-04-15')
    })

    it('advances to the next quarterly slot when after is past the anchor day', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-15',
        after: '2024-01-20',
      })
      assert.strictEqual(result, '2024-04-15')
    })

    it('returns the first quarterly hit after a mid-quarter after date', () => {
      // Anchor is Feb, so quarterly months are Feb, May, Aug, Nov
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-02-10',
        after: '2024-03-15',
      })
      assert.strictEqual(result, '2024-05-10')
    })

    it('rolls over year boundary correctly', () => {
      // Anchor Nov, quarterly months: Nov, Feb, May, Aug
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-11-10',
        after: '2024-11-10',
      })
      assert.strictEqual(result, '2025-02-10')
    })
  })

  describe('Quarterly — 28th-shift (short months)', () => {
    it('anchor 31 steps Jan → Apr 30, Jul 31, Oct 31', () => {
      const apr = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-31',
        after: '2024-03-31',
      })
      assert.strictEqual(apr, '2024-04-30')

      const jul = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-31',
        after: '2024-06-30',
      })
      assert.strictEqual(jul, '2024-07-31')

      const oct = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-31',
        after: '2024-09-30',
      })
      assert.strictEqual(oct, '2024-10-31')
    })

    it('anchor 29 into Feb of non-leap year → Feb 28', () => {
      // Anchor Nov 29, quarterly slots: Nov, Feb, May, Aug
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-11-29',
        after: '2025-01-31',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('anchor 30 into Feb of non-leap year → Feb 28', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-11-30',
        after: '2025-01-31',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('anchor 28 into Feb always stays at 28', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-11-28',
        after: '2025-01-31',
      })
      assert.strictEqual(result, '2025-02-28')
    })
  })

  describe('Quarterly — strictly-after semantics', () => {
    it('when after equals the quarterly date it advances to the next period', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-01',
        after: '2024-04-01',
      })
      assert.strictEqual(result, '2024-07-01')
    })

    it('anchor == after returns the next quarterly slot', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Quarterly',
        anchorDate: '2024-03-15',
        after: '2024-03-15',
      })
      assert.strictEqual(result, '2024-06-15')
    })
  })

  describe('Yearly — basic', () => {
    it('returns the same month/day in the same year when not yet passed', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-06-15',
        after: '2026-06-14',
      })
      assert.strictEqual(result, '2026-06-15')
    })

    it('advances to next year when anchor date equals after', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-06-15',
        after: '2026-06-15',
      })
      assert.strictEqual(result, '2027-06-15')
    })

    it('advances to next year when after is past the anchor day in the same year', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-06-15',
        after: '2026-07-01',
      })
      assert.strictEqual(result, '2027-06-15')
    })
  })

  describe('Yearly — 28th-shift (Feb 29 anchor)', () => {
    it('Feb 29 anchor → Feb 29 in a leap year', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-02-29',
        after: '2028-01-01',
      })
      assert.strictEqual(result, '2028-02-29')
    })

    it('Feb 29 anchor → Feb 28 in a non-leap year', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-02-29',
        after: '2025-01-01',
      })
      assert.strictEqual(result, '2025-02-28')
    })

    it('Feb 29 anchor with after == Feb 28 in non-leap year advances to next year', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-02-29',
        after: '2025-02-28',
      })
      assert.strictEqual(result, '2026-02-28')
    })
  })

  describe('Yearly — May 31 anchor (always 31 days)', () => {
    it('returns May 31 every year', () => {
      const r1 = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-05-31',
        after: '2025-05-30',
      })
      assert.strictEqual(r1, '2025-05-31')

      const r2 = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-05-31',
        after: '2025-05-31',
      })
      assert.strictEqual(r2, '2026-05-31')
    })
  })

  describe('Yearly — strictly-after semantics', () => {
    it('when after equals the yearly date it advances to the next year', () => {
      const result = nextOccurrenceAfter({
        recurrence: 'Yearly',
        anchorDate: '2024-03-10',
        after: '2025-03-10',
      })
      assert.strictEqual(result, '2026-03-10')
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

describe('occurrencesToGenerate', () => {
  describe('input validation', () => {
    it('throws on invalid anchorDate', () => {
      assert.throws(
        () => occurrencesToGenerate({ recurrence: 'Monthly', anchorDate: 'bad', createdAt: '2024-01-01', today: '2024-03-01' }),
        /anchorDate/,
      )
    })

    it('throws on invalid createdAt', () => {
      assert.throws(
        () => occurrencesToGenerate({ recurrence: 'Monthly', anchorDate: '2024-01-15', createdAt: 'bad', today: '2024-03-01' }),
        /createdAt/,
      )
    })

    it('throws on invalid lastOccurrence', () => {
      assert.throws(
        () => occurrencesToGenerate({ recurrence: 'Monthly', anchorDate: '2024-01-15', createdAt: '2024-01-01', lastOccurrence: 'bad', today: '2024-03-01' }),
        /lastOccurrence/,
      )
    })

    it('throws on invalid today', () => {
      assert.throws(
        () => occurrencesToGenerate({ recurrence: 'Monthly', anchorDate: '2024-01-15', createdAt: '2024-01-01', today: 'bad' }),
        /today/,
      )
    })
  })

  describe('first-occurrence rule', () => {
    it('returns empty when created today and anchor is later this month', () => {
      // Created on Jan 10, anchor day 15, today = Jan 10 — first hit Jan 15 > today
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-10',
        today: '2024-01-10',
      })
      assert.deepStrictEqual(result, [])
    })

    it('returns empty when created on the anchor day and today is the same day', () => {
      // Created Jan 15, anchor Jan 15, today Jan 15 — hit on Jan 15 is NOT > createdAt
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-15',
        today: '2024-01-15',
      })
      assert.deepStrictEqual(result, [])
    })

    it('never returns a date <= createdAt even with no lastOccurrence', () => {
      // createdAt is after anchor day; first valid hit is next month
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-20',
        today: '2024-03-20',
      })
      assert.deepStrictEqual(result, ['2024-02-15', '2024-03-15'])
    })

    it('includes the day after createdAt if it matches the anchor', () => {
      // Created Jan 14, anchor 15 Monthly, today Jan 15 → Jan 15 > Jan 14 and <= today
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-14',
        today: '2024-01-15',
      })
      assert.deepStrictEqual(result, ['2024-01-15'])
    })
  })

  describe('lastOccurrence exclusive lower bound', () => {
    it('returns empty when lastOccurrence equals today', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-01',
        lastOccurrence: '2024-03-15',
        today: '2024-03-15',
      })
      assert.deepStrictEqual(result, [])
    })

    it('does not re-generate the lastOccurrence date itself', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-01',
        lastOccurrence: '2024-02-15',
        today: '2024-04-15',
      })
      assert.deepStrictEqual(result, ['2024-03-15', '2024-04-15'])
    })

    it('catch-up returns N entries across N missed periods', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-10',
        createdAt: '2024-01-01',
        lastOccurrence: '2024-01-10',
        today: '2024-04-10',
      })
      assert.deepStrictEqual(result, ['2024-02-10', '2024-03-10', '2024-04-10'])
    })

    it('today inclusive upper bound — candidate equal to today IS included', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Monthly',
        anchorDate: '2024-01-15',
        createdAt: '2024-01-01',
        lastOccurrence: '2024-02-15',
        today: '2024-03-15',
      })
      assert.deepStrictEqual(result, ['2024-03-15'])
    })
  })

  describe('works for Quarterly', () => {
    it('returns quarterly occurrences between lastOccurrence and today', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-10',
        createdAt: '2024-01-01',
        lastOccurrence: '2024-01-10',
        today: '2024-10-10',
      })
      assert.deepStrictEqual(result, ['2024-04-10', '2024-07-10', '2024-10-10'])
    })

    it('first-occurrence rule applies for Quarterly', () => {
      // Created on the anchor date — next quarterly hit is 3 months later
      const result = occurrencesToGenerate({
        recurrence: 'Quarterly',
        anchorDate: '2024-01-10',
        createdAt: '2024-01-10',
        today: '2024-01-10',
      })
      assert.deepStrictEqual(result, [])
    })
  })

  describe('works for Yearly', () => {
    it('returns yearly occurrences between lastOccurrence and today', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Yearly',
        anchorDate: '2022-06-15',
        createdAt: '2022-06-01',
        lastOccurrence: '2022-06-15',
        today: '2025-06-15',
      })
      assert.deepStrictEqual(result, ['2023-06-15', '2024-06-15', '2025-06-15'])
    })

    it('first-occurrence rule applies for Yearly', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Yearly',
        anchorDate: '2024-06-15',
        createdAt: '2024-06-15',
        today: '2024-06-15',
      })
      assert.deepStrictEqual(result, [])
    })

    it('Feb 29 anchor generates Feb 28 in non-leap years', () => {
      const result = occurrencesToGenerate({
        recurrence: 'Yearly',
        anchorDate: '2024-02-29',
        createdAt: '2024-02-29',
        today: '2026-03-01',
      })
      assert.deepStrictEqual(result, ['2025-02-28', '2026-02-28'])
    })
  })
})
