// ====================================
// Tests for expense-validators.ts
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'

import {
  parseCategoryCreate,
  parseCategoryDelete,
  parseCategoryMergeConfirm,
  parseCategoryRename,
  parseExpenseCreate,
  parseExpenseListFilters,
  parseNewCategoryName,
  parseRecurringCreate,
  parseSummaryQuery,
  parseTagCsv,
  parseTagCreate,
  parseTagDelete,
  parseTagMergeConfirm,
  parseTagRename,
  descriptionMax,
  categoryNameMax,
  tagNameMax,
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

const expectFieldErr = (input: Partial<typeof VALID>, expectedFields: Array<keyof FieldErrors>) => {
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

  describe('parseTagCsv', () => {
    it('returns ok([]) for empty string', () => {
      const r = parseTagCsv('')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, [])
      }
    })

    it('parses a simple two-tag CSV', () => {
      const r = parseTagCsv('food, groceries')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, ['food', 'groceries'])
      }
    })

    it('case-insensitively de-duplicates', () => {
      const r = parseTagCsv('Food, food, FOOD')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, ['food'])
      }
    })

    it('trims whitespace per entry', () => {
      const r = parseTagCsv('  food  ,   groceries')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, ['food', 'groceries'])
      }
    })

    it('rejects a single tagNameMax + 1 char name', () => {
      const r = parseTagCsv('a'.repeat(tagNameMax + 1))
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.length > 0)
      }
    })

    it('rejects when any tag in a longer list exceeds the limit', () => {
      const tooLong = 'a'.repeat(tagNameMax + 1)
      const r = parseTagCsv(`food, ${tooLong}, groceries`)
      assert.strictEqual(r.isErr, true)
    })

    it('returns ok([]) for an all-empty CSV', () => {
      const r = parseTagCsv(', ,  ,')
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, [])
      }
    })

    it('accepts exactly tagNameMax characters', () => {
      const r = parseTagCsv('a'.repeat(tagNameMax))
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, ['a'.repeat(tagNameMax)])
      }
    })
  })

  describe('multi-field failure', () => {
    it('reports errors for every invalid field at once', () => {
      expectFieldErr({ description: '', amount: '0', date: '2025-13-40', category: '' }, [
        'description',
        'amount',
        'date',
        'category',
      ])
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

describe('category management validators', () => {
  describe('parseCategoryCreate', () => {
    it('trims and lowercases valid names', () => {
      const r = parseCategoryCreate({ name: '  Groceries  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { name: 'groceries' })
      }
    })

    it('rejects empty names with a field error', () => {
      const r = parseCategoryCreate({ name: '   ' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })

    it('rejects categoryNameMax + 1 characters', () => {
      const r = parseCategoryCreate({ name: 'a'.repeat(categoryNameMax + 1) })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })
  })

  describe('parseCategoryRename', () => {
    it('returns id and normalized name', () => {
      const r = parseCategoryRename({ id: 'cat-1', name: '  Utilities  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { id: 'cat-1', name: 'utilities' })
      }
    })

    it('reports both id and name errors', () => {
      const r = parseCategoryRename({ id: '', name: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.id)
        assert.ok(r.error.name)
      }
    })
  })

  describe('parseCategoryMergeConfirm', () => {
    it('returns source and target ids', () => {
      const r = parseCategoryMergeConfirm({ sourceId: 'source', targetId: 'target' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { sourceId: 'source', targetId: 'target' })
      }
    })

    it('rejects matching source and target ids', () => {
      const r = parseCategoryMergeConfirm({ sourceId: 'same', targetId: 'same' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.targetId)
      }
    })

    it('reports missing source and target ids', () => {
      const r = parseCategoryMergeConfirm({ sourceId: '', targetId: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.sourceId)
        assert.ok(r.error.targetId)
      }
    })
  })

  describe('parseCategoryDelete', () => {
    it('returns trimmed id', () => {
      const r = parseCategoryDelete({ id: '  cat-1  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { id: 'cat-1' })
      }
    })

    it('rejects missing id', () => {
      const r = parseCategoryDelete({ id: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.id)
      }
    })
  })
})

describe('tag management validators', () => {
  describe('parseTagCreate', () => {
    it('trims and lowercases valid names', () => {
      const r = parseTagCreate({ name: '  Travel  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { name: 'travel' })
      }
    })

    it('rejects empty names with a field error', () => {
      const r = parseTagCreate({ name: '   ' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })

    it('rejects tagNameMax + 1 characters', () => {
      const r = parseTagCreate({ name: 'a'.repeat(tagNameMax + 1) })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })

    it('accepts exactly tagNameMax characters', () => {
      const r = parseTagCreate({ name: 'a'.repeat(tagNameMax) })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.strictEqual(r.value.name, 'a'.repeat(tagNameMax))
      }
    })

    it('normalizes mixed-case duplicate targets as the same lowercased name', () => {
      const r1 = parseTagCreate({ name: 'TRAVEL' })
      const r2 = parseTagCreate({ name: 'travel' })
      assert.strictEqual(r1.isOk, true)
      assert.strictEqual(r2.isOk, true)
      if (r1.isOk && r2.isOk) {
        assert.strictEqual(r1.value.name, r2.value.name)
      }
    })
  })

  describe('parseTagRename', () => {
    it('returns id and normalized name', () => {
      const r = parseTagRename({ id: 'tag-1', name: '  Trips  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { id: 'tag-1', name: 'trips' })
      }
    })

    it('reports both id and name errors', () => {
      const r = parseTagRename({ id: '', name: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.id)
        assert.ok(r.error.name)
      }
    })

    it('rejects tagNameMax + 1 char name', () => {
      const r = parseTagRename({ id: 'tag-1', name: 'a'.repeat(tagNameMax + 1) })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })
  })

  describe('parseTagMergeConfirm', () => {
    it('returns source and target ids', () => {
      const r = parseTagMergeConfirm({ sourceId: 'source', targetId: 'target' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { sourceId: 'source', targetId: 'target' })
      }
    })

    it('rejects matching source and target ids', () => {
      const r = parseTagMergeConfirm({ sourceId: 'same', targetId: 'same' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.targetId)
      }
    })

    it('reports missing source and target ids', () => {
      const r = parseTagMergeConfirm({ sourceId: '', targetId: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.sourceId)
        assert.ok(r.error.targetId)
      }
    })
  })

  describe('parseTagDelete', () => {
    it('returns trimmed id', () => {
      const r = parseTagDelete({ id: '  tag-1  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { id: 'tag-1' })
      }
    })

    it('rejects missing id', () => {
      const r = parseTagDelete({ id: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.id)
      }
    })
  })
})

describe('parseExpenseListFilters (Issue 11)', () => {
  it('reports hasFilterParams false when no params are present', () => {
    const r = parseExpenseListFilters({})
    assert.strictEqual(r.hasFilterParams, false)
    assert.deepStrictEqual(r.filters.tagIds, [])
    assert.strictEqual(r.filters.tagMode, 'or')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('reports hasFilterParams true when at least one param is present', () => {
    const r = parseExpenseListFilters({ description: '' })
    assert.strictEqual(r.hasFilterParams, true)
  })

  it('trims description and returns it when non-empty', () => {
    const r = parseExpenseListFilters({ description: '  Lunch  ' })
    assert.strictEqual(r.filters.description, 'Lunch')
  })

  it('treats whitespace-only description as absent (no filter applied)', () => {
    const r = parseExpenseListFilters({ description: '   ' })
    assert.strictEqual(r.filters.description, undefined)
  })

  it('parses a valid from date', () => {
    const r = parseExpenseListFilters({ from: '2024-03-01' })
    assert.strictEqual(r.filters.from, '2024-03-01')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('returns a field error for a bad from date', () => {
    const r = parseExpenseListFilters({ from: '2024-13-99' })
    assert.strictEqual(r.filters.from, undefined)
    assert.ok(r.fieldErrors.date)
  })

  it('parses a valid to date', () => {
    const r = parseExpenseListFilters({ to: '2024-12-31' })
    assert.strictEqual(r.filters.to, '2024-12-31')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('returns a field error for a bad to date', () => {
    const r = parseExpenseListFilters({ to: 'not-a-date' })
    assert.strictEqual(r.filters.to, undefined)
    assert.ok(r.fieldErrors.date)
  })

  it('open-from: only from set, to absent', () => {
    const r = parseExpenseListFilters({ from: '2024-01-01' })
    assert.strictEqual(r.filters.from, '2024-01-01')
    assert.strictEqual(r.filters.to, undefined)
  })

  it('open-to: only to set, from absent', () => {
    const r = parseExpenseListFilters({ to: '2024-12-31' })
    assert.strictEqual(r.filters.to, '2024-12-31')
    assert.strictEqual(r.filters.from, undefined)
  })

  it('both-set: from and to both present', () => {
    const r = parseExpenseListFilters({ from: '2024-01-01', to: '2024-12-31' })
    assert.strictEqual(r.filters.from, '2024-01-01')
    assert.strictEqual(r.filters.to, '2024-12-31')
  })

  it('both-absent: from and to both undefined', () => {
    const r = parseExpenseListFilters({})
    assert.strictEqual(r.filters.from, undefined)
    assert.strictEqual(r.filters.to, undefined)
  })

  it('collects and deduplicates multiple tagId values', () => {
    const r = parseExpenseListFilters({ tagId: ['id-1', 'id-2', 'id-1'] })
    assert.deepStrictEqual(r.filters.tagIds, ['id-1', 'id-2'])
  })

  it('handles a single tagId string', () => {
    const r = parseExpenseListFilters({ tagId: 'single-id' })
    assert.deepStrictEqual(r.filters.tagIds, ['single-id'])
  })

  it('tagMode defaults to or when absent', () => {
    const r = parseExpenseListFilters({})
    assert.strictEqual(r.filters.tagMode, 'or')
  })

  it('tagMode accepts or explicitly', () => {
    const r = parseExpenseListFilters({ tagMode: 'or' })
    assert.strictEqual(r.filters.tagMode, 'or')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('tagMode accepts and', () => {
    const r = parseExpenseListFilters({ tagMode: 'and' })
    assert.strictEqual(r.filters.tagMode, 'and')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('tagMode rejects unknown values', () => {
    const r = parseExpenseListFilters({ tagMode: 'xor' })
    assert.ok(r.fieldErrors.tags)
    assert.strictEqual(r.filters.tagMode, 'or')
  })

  it('categoryId is parsed when present', () => {
    const r = parseExpenseListFilters({ categoryId: 'cat-1' })
    assert.strictEqual(r.filters.categoryId, 'cat-1')
  })

  it('non-string categoryId (absent) produces no categoryId', () => {
    const r = parseExpenseListFilters({})
    assert.strictEqual(r.filters.categoryId, undefined)
  })

  it('empty categoryId is treated as absent', () => {
    const r = parseExpenseListFilters({ categoryId: '  ' })
    assert.strictEqual(r.filters.categoryId, undefined)
  })

  it('rejects from after to with a date field error', () => {
    const r = parseExpenseListFilters({ from: '2024-12-31', to: '2024-01-01' })
    assert.ok(r.fieldErrors.date)
  })

  it('accepts from equal to to (same day)', () => {
    const r = parseExpenseListFilters({ from: '2024-06-15', to: '2024-06-15' })
    assert.strictEqual(r.filters.from, '2024-06-15')
    assert.strictEqual(r.filters.to, '2024-06-15')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('does not set a date error when only from is present', () => {
    const r = parseExpenseListFilters({ from: '2024-12-31' })
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('does not set a date error when only to is present', () => {
    const r = parseExpenseListFilters({ to: '2024-01-01' })
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('keeps the earlier bad-format error when from is invalid and from > to would also apply', () => {
    const r = parseExpenseListFilters({ from: 'bad', to: '2024-01-01' })
    assert.ok(r.fieldErrors.date)
    assert.strictEqual(r.filters.from, undefined)
  })
})

describe('parseSummaryQuery (Issue 14)', () => {
  it('defaults groupBy to month, from/to to defaultRangeEt', () => {
    const r = parseSummaryQuery({})
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.strictEqual(r.value.groupBy, 'month')
      assert.ok(r.value.from.length === 10)
      assert.ok(r.value.to.length === 10)
      assert.ok(r.value.from <= r.value.to)
      assert.deepStrictEqual(r.value.tagIds, [])
      assert.strictEqual(r.value.tagMode, 'or')
    }
  })

  it('accepts groupBy year', () => {
    const r = parseSummaryQuery({ groupBy: 'year' })
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.strictEqual(r.value.groupBy, 'year')
    }
  })

  it('rejects invalid groupBy', () => {
    const r = parseSummaryQuery({ groupBy: 'week' })
    assert.strictEqual(r.isErr, true)
    if (r.isErr) {
      assert.ok(r.error.groupBy)
    }
  })

  it('parses valid from and to dates', () => {
    const r = parseSummaryQuery({ from: '2024-01-01', to: '2024-03-31' })
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.strictEqual(r.value.from, '2024-01-01')
      assert.strictEqual(r.value.to, '2024-03-31')
    }
  })

  it('rejects invalid from date', () => {
    const r = parseSummaryQuery({ from: '2024-13-99' })
    assert.strictEqual(r.isErr, true)
    if (r.isErr) {
      assert.ok(r.error.date)
    }
  })

  it('rejects invalid to date', () => {
    const r = parseSummaryQuery({ to: 'not-a-date' })
    assert.strictEqual(r.isErr, true)
    if (r.isErr) {
      assert.ok(r.error.date)
    }
  })

  it('rejects from after to', () => {
    const r = parseSummaryQuery({ from: '2024-12-31', to: '2024-01-01' })
    assert.strictEqual(r.isErr, true)
    if (r.isErr) {
      assert.ok(r.error.date)
    }
  })

  it('parses categoryId', () => {
    const r = parseSummaryQuery({ categoryId: 'cat-1' })
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.strictEqual(r.value.categoryId, 'cat-1')
    }
  })

  it('collects and deduplicates tagIds', () => {
    const r = parseSummaryQuery({ tagId: ['id-1', 'id-2', 'id-1'] })
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.deepStrictEqual(r.value.tagIds, ['id-1', 'id-2'])
    }
  })

  it('defaults tagMode to or', () => {
    const r = parseSummaryQuery({})
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.strictEqual(r.value.tagMode, 'or')
    }
  })

  it('accepts tagMode and', () => {
    const r = parseSummaryQuery({ tagMode: 'and' })
    assert.strictEqual(r.isOk, true)
    if (r.isOk) {
      assert.strictEqual(r.value.tagMode, 'and')
    }
  })

  it('rejects invalid tagMode', () => {
    const r = parseSummaryQuery({ tagMode: 'xor' })
    assert.strictEqual(r.isErr, true)
    if (r.isErr) {
      assert.ok(r.error.tags)
    }
  })
})

// ====================================
// parseRecurringCreate
// ====================================

const RECURRING_VALID = {
  description: 'Monthly rent',
  amount: '1200.00',
  category: 'Housing',
  recurrence: 'Monthly',
  anchorDate: '2025-01-15',
}

type RVShape = typeof RECURRING_VALID

const expectRecurringOk = (
  input: RVShape,
  expected: { amountCents: number; recurrence: string; anchorDate: string },
) => {
  const r = parseRecurringCreate(input)
  assert.strictEqual(r.isOk, true, `expected ok for ${JSON.stringify(input)}`)
  if (r.isOk) {
    assert.strictEqual(r.value.amountCents, expected.amountCents)
    assert.strictEqual(r.value.description, input.description.trim())
    assert.strictEqual(r.value.category, input.category.trim())
    assert.strictEqual(r.value.recurrence, expected.recurrence)
    assert.strictEqual(r.value.anchorDate, expected.anchorDate)
  }
}

const expectRecurringFieldErr = (
  input: Partial<RVShape>,
  expectedFields: Array<keyof FieldErrors>,
) => {
  const r = parseRecurringCreate({ ...RECURRING_VALID, ...input })
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

describe('parseRecurringCreate', () => {
  describe('happy paths', () => {
    it('accepts Monthly recurrence', () => {
      expectRecurringOk(
        { ...RECURRING_VALID, recurrence: 'Monthly' },
        { amountCents: 120000, recurrence: 'Monthly', anchorDate: '2025-01-15' },
      )
    })

    it('accepts Quarterly recurrence', () => {
      expectRecurringOk(
        { ...RECURRING_VALID, recurrence: 'Quarterly' },
        { amountCents: 120000, recurrence: 'Quarterly', anchorDate: '2025-01-15' },
      )
    })

    it('accepts Yearly recurrence', () => {
      expectRecurringOk(
        { ...RECURRING_VALID, recurrence: 'Yearly' },
        { amountCents: 120000, recurrence: 'Yearly', anchorDate: '2025-01-15' },
      )
    })

    it('accepts anchor date at end of month', () => {
      expectRecurringOk(
        { ...RECURRING_VALID, anchorDate: '2025-01-31' },
        { amountCents: 120000, recurrence: 'Monthly', anchorDate: '2025-01-31' },
      )
    })

    it('accepts leap-year Feb 29', () => {
      expectRecurringOk(
        { ...RECURRING_VALID, anchorDate: '2024-02-29' },
        { amountCents: 120000, recurrence: 'Monthly', anchorDate: '2024-02-29' },
      )
    })
  })

  describe('description', () => {
    it('rejects empty description', () => {
      expectRecurringFieldErr({ description: '' }, ['description'])
    })

    it('rejects whitespace-only description', () => {
      expectRecurringFieldErr({ description: '   ' }, ['description'])
    })

    it('rejects description over descriptionMax', () => {
      expectRecurringFieldErr({ description: 'a'.repeat(descriptionMax + 1) }, ['description'])
    })

    it('accepts exactly descriptionMax characters', () => {
      expectRecurringOk(
        { ...RECURRING_VALID, description: 'a'.repeat(descriptionMax) },
        { amountCents: 120000, recurrence: 'Monthly', anchorDate: '2025-01-15' },
      )
    })
  })

  describe('amount', () => {
    it('rejects amount of zero', () => {
      expectRecurringFieldErr({ amount: '0' }, ['amount'])
    })

    it('rejects empty amount', () => {
      expectRecurringFieldErr({ amount: '' }, ['amount'])
    })

    it('rejects amount with three decimal places', () => {
      expectRecurringFieldErr({ amount: '1.234' }, ['amount'])
    })

    it('rejects negative amount', () => {
      expectRecurringFieldErr({ amount: '-5.00' }, ['amount'])
    })
  })

  describe('category', () => {
    it('rejects empty category', () => {
      expectRecurringFieldErr({ category: '' }, ['category'])
    })

    it('rejects whitespace-only category', () => {
      expectRecurringFieldErr({ category: '   ' }, ['category'])
    })
  })

  describe('recurrence', () => {
    it('rejects empty recurrence', () => {
      expectRecurringFieldErr({ recurrence: '' }, ['recurrence'])
    })

    it('rejects unknown recurrence value', () => {
      expectRecurringFieldErr({ recurrence: 'Weekly' }, ['recurrence'])
    })

    it('rejects lowercase monthly', () => {
      expectRecurringFieldErr({ recurrence: 'monthly' }, ['recurrence'])
    })

    it('rejects mixed-case value', () => {
      expectRecurringFieldErr({ recurrence: 'MONTHLY' }, ['recurrence'])
    })
  })

  describe('anchorDate', () => {
    it('rejects empty anchor date', () => {
      expectRecurringFieldErr({ anchorDate: '' }, ['anchorDate'])
    })

    it('rejects malformed date string', () => {
      expectRecurringFieldErr({ anchorDate: '15-01-2025' }, ['anchorDate'])
    })

    it('rejects impossible date Feb 30', () => {
      expectRecurringFieldErr({ anchorDate: '2025-02-30' }, ['anchorDate'])
    })

    it('rejects impossible date Feb 29 in non-leap year', () => {
      expectRecurringFieldErr({ anchorDate: '2025-02-29' }, ['anchorDate'])
    })

    it('rejects month 13', () => {
      expectRecurringFieldErr({ anchorDate: '2025-13-01' }, ['anchorDate'])
    })
  })

  describe('multiple errors', () => {
    it('returns errors for all invalid fields simultaneously', () => {
      const r = parseRecurringCreate({
        description: '',
        amount: '0',
        category: '',
        recurrence: 'Weekly',
        anchorDate: '2025-02-30',
      })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.description)
        assert.ok(r.error.amount)
        assert.ok(r.error.category)
        assert.ok(r.error.recurrence)
        assert.ok(r.error.anchorDate)
      }
    })
  })
})
