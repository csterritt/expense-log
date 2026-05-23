// ====================================
// Tests for et-date.ts
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'node:test'
import assert from 'node:assert'

import { todayEt, defaultRangeEt, isValidYmd, monthKeyEt, quarterKeyEt, yearKeyEt } from '../src/lib/et-date'

describe('todayEt', () => {
  it('returns ET date just before EST->EDT spring-forward boundary', () => {
    // 2024-03-10T06:59:00Z === 2024-03-10 01:59 EST (pre-jump)
    assert.strictEqual(todayEt(new Date('2024-03-10T06:59:00Z')), '2024-03-10')
  })

  it('returns ET date just after EST->EDT spring-forward boundary', () => {
    // 2024-03-10T07:00:00Z === 2024-03-10 03:00 EDT (post-jump)
    assert.strictEqual(todayEt(new Date('2024-03-10T07:00:00Z')), '2024-03-10')
  })

  it('returns ET date just before EDT->EST fall-back boundary', () => {
    // 2024-11-03T05:30:00Z === 2024-11-03 01:30 EDT
    assert.strictEqual(todayEt(new Date('2024-11-03T05:30:00Z')), '2024-11-03')
  })

  it('returns ET date just after EDT->EST fall-back boundary', () => {
    // 2024-11-03T06:30:00Z === 2024-11-03 01:30 EST (after clocks fell back)
    assert.strictEqual(todayEt(new Date('2024-11-03T06:30:00Z')), '2024-11-03')
  })

  it('handles the UTC->ET rollback across midnight', () => {
    // 2024-07-01T03:00:00Z === 2024-06-30 23:00 EDT
    assert.strictEqual(todayEt(new Date('2024-07-01T03:00:00Z')), '2024-06-30')
  })
})

describe('defaultRangeEt', () => {
  it('wraps year when todayEt is in January', () => {
    // Mid-January reference
    const range = defaultRangeEt(new Date('2024-01-15T17:00:00Z'))
    assert.deepStrictEqual(range, { from: '2023-11-01', to: '2024-01-15' })
  })

  it('wraps year when todayEt is in February', () => {
    const range = defaultRangeEt(new Date('2024-02-10T17:00:00Z'))
    assert.deepStrictEqual(range, { from: '2023-12-01', to: '2024-02-10' })
  })

  it('produces January 1 from March 1', () => {
    const range = defaultRangeEt(new Date('2024-03-01T17:00:00Z'))
    assert.deepStrictEqual(range, { from: '2024-01-01', to: '2024-03-01' })
  })

  it('produces October 1 from December 15', () => {
    const range = defaultRangeEt(new Date('2024-12-15T17:00:00Z'))
    assert.deepStrictEqual(range, { from: '2024-10-01', to: '2024-12-15' })
  })
})

describe('isValidYmd', () => {
  it('accepts a valid leap day', () => {
    assert.strictEqual(isValidYmd('2024-02-29'), true)
  })

  it('rejects a leap day in a non-leap year', () => {
    assert.strictEqual(isValidYmd('2023-02-29'), false)
  })

  it('rejects month 13', () => {
    assert.strictEqual(isValidYmd('2024-13-01'), false)
  })

  it('rejects April 31', () => {
    assert.strictEqual(isValidYmd('2024-04-31'), false)
  })

  it('rejects empty string', () => {
    assert.strictEqual(isValidYmd(''), false)
  })

  it('rejects missing dashes', () => {
    assert.strictEqual(isValidYmd('20240101'), false)
  })

  it('rejects trailing garbage', () => {
    assert.strictEqual(isValidYmd('2024-01-01X'), false)
  })

  it('rejects short year', () => {
    assert.strictEqual(isValidYmd('24-01-01'), false)
  })

  it('rejects single-digit month', () => {
    assert.strictEqual(isValidYmd('2024-1-01'), false)
  })

  it('accepts ordinary dates', () => {
    assert.strictEqual(isValidYmd('2024-01-01'), true)
    assert.strictEqual(isValidYmd('1999-12-31'), true)
  })
})

describe('monthKeyEt', () => {
  const cases: [string, string][] = [
    ['2024-01-15', 'Jan'],
    ['2024-02-29', 'Feb'],
    ['2024-03-31', 'Mar'],
    ['2024-04-01', 'Apr'],
    ['2024-05-10', 'May'],
    ['2024-06-30', 'Jun'],
    ['2024-07-01', 'Jul'],
    ['2024-08-20', 'Aug'],
    ['2024-09-30', 'Sep'],
    ['2024-10-01', 'Oct'],
    ['2024-11-05', 'Nov'],
    ['2024-12-31', 'Dec'],
  ]
  for (const [input, expected] of cases) {
    it(`maps ${input} to ${expected}`, () => {
      assert.strictEqual(monthKeyEt(input), expected)
    })
  }

  it('rejects an invalid date', () => {
    assert.throws(() => monthKeyEt('2024-13-01'))
  })

  it('rejects empty string', () => {
    assert.throws(() => monthKeyEt(''))
  })

  it('rejects a non-leap-year Feb 29', () => {
    assert.throws(() => monthKeyEt('2023-02-29'))
  })
})

describe('quarterKeyEt', () => {
  const cases: [string, string][] = [
    ['2024-01-01', 'Jan-Mar'],
    ['2024-02-29', 'Jan-Mar'],
    ['2024-03-31', 'Jan-Mar'],
    ['2024-04-01', 'Apr-Jun'],
    ['2024-06-30', 'Apr-Jun'],
    ['2024-07-01', 'Jul-Sep'],
    ['2024-09-30', 'Jul-Sep'],
    ['2024-10-01', 'Oct-Dec'],
    ['2024-12-31', 'Oct-Dec'],
    ['2025-01-01', 'Jan-Mar'],
  ]
  for (const [input, expected] of cases) {
    it(`maps ${input} to ${expected}`, () => {
      assert.strictEqual(quarterKeyEt(input), expected)
    })
  }

  it('rejects an invalid date', () => {
    assert.throws(() => quarterKeyEt('2024-04-31'))
  })

  it('rejects missing dashes', () => {
    assert.throws(() => quarterKeyEt('20240101'))
  })
})

describe('yearKeyEt', () => {
  const cases: [string, string][] = [
    ['2024-01-01', '2024'],
    ['2024-02-29', '2024'],
    ['2024-12-31', '2024'],
    ['2025-06-15', '2025'],
    ['1999-12-31', '1999'],
  ]
  for (const [input, expected] of cases) {
    it(`maps ${input} to ${expected}`, () => {
      assert.strictEqual(yearKeyEt(input), expected)
    })
  }

  it('rejects an invalid date', () => {
    assert.throws(() => yearKeyEt('2024-00-01'))
  })

  it('rejects trailing garbage', () => {
    assert.throws(() => yearKeyEt('2024-01-01X'))
  })
})
