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
  parseTagInputs,
  parseCategoryInput,
  TAG_ID_RAW_CAP,
  NEW_TAGS_RAW_LENGTH_CAP,
  NEW_TAGS_TOKEN_COUNT_CAP,
  descriptionMax,
  categoryNameMax,
  tagNameMax,
  type FieldErrors,
  type ExistingTag,
  type ExistingCategory,
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

  it('silently drops a bad from date (treated as absent, no error)', () => {
    const r = parseExpenseListFilters({ from: '2024-13-99' })
    assert.strictEqual(r.filters.from, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('parses a valid to date', () => {
    const r = parseExpenseListFilters({ to: '2024-12-31' })
    assert.strictEqual(r.filters.to, '2024-12-31')
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently drops a bad to date (treated as absent, no error)', () => {
    const r = parseExpenseListFilters({ to: 'not-a-date' })
    assert.strictEqual(r.filters.to, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
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

  it('collects and deduplicates multiple valid ULID tagId values', () => {
    const r = parseExpenseListFilters({ tagId: [VALID_ULID, VALID_ULID_2, VALID_ULID] })
    assert.deepStrictEqual(r.filters.tagIds, [VALID_ULID, VALID_ULID_2])
  })

  it('handles a single valid ULID tagId string', () => {
    const r = parseExpenseListFilters({ tagId: VALID_ULID })
    assert.deepStrictEqual(r.filters.tagIds, [VALID_ULID])
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

  it('silently drops invalid from and leaves to intact, no error even when from > to would apply', () => {
    const r = parseExpenseListFilters({ from: 'bad', to: '2024-01-01' })
    assert.deepStrictEqual(r.fieldErrors, {})
    assert.strictEqual(r.filters.from, undefined)
    assert.strictEqual(r.filters.to, '2024-01-01')
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

// ====================================
// parseSummaryQuery (Issue 17)
// ====================================

describe('parseSummaryQuery', () => {
  describe('defaults on empty input', () => {
    it('hasFilterParams is false when no params are present', () => {
      const r = parseSummaryQuery({})
      assert.strictEqual(r.hasFilterParams, false)
    })

    it('dimension defaults to category', () => {
      const r = parseSummaryQuery({})
      assert.strictEqual(r.dimension, 'category')
    })

    it('granularity defaults to month', () => {
      const r = parseSummaryQuery({})
      assert.strictEqual(r.granularity, 'month')
    })

    it('tagIds defaults to empty array', () => {
      const r = parseSummaryQuery({})
      assert.deepStrictEqual(r.tagIds, [])
    })

    it('sort defaults to empty array', () => {
      const r = parseSummaryQuery({})
      assert.deepStrictEqual(r.sort, [])
    })

    it('fieldErrors defaults to empty object', () => {
      const r = parseSummaryQuery({})
      assert.deepStrictEqual(r.fieldErrors, {})
    })
  })

  describe('dimension', () => {
    it('accepts time', () => {
      const r = parseSummaryQuery({ dimension: 'time' })
      assert.strictEqual(r.dimension, 'time')
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('accepts category', () => {
      const r = parseSummaryQuery({ dimension: 'category' })
      assert.strictEqual(r.dimension, 'category')
    })

    it('accepts tag', () => {
      const r = parseSummaryQuery({ dimension: 'tag' })
      assert.strictEqual(r.dimension, 'tag')
    })

    it('accepts category-tag', () => {
      const r = parseSummaryQuery({ dimension: 'category-tag' })
      assert.strictEqual(r.dimension, 'category-tag')
    })

    it('rejects an unknown dimension with a field error', () => {
      const r = parseSummaryQuery({ dimension: 'foobar' })
      assert.ok(r.fieldErrors.groupBy, `expected groupBy error; got ${JSON.stringify(r.fieldErrors)}`)
      assert.strictEqual(r.dimension, 'category')
    })

    it('presence of dimension key flips hasFilterParams to true', () => {
      const r = parseSummaryQuery({ dimension: 'time' })
      assert.strictEqual(r.hasFilterParams, true)
    })
  })

  describe('granularity', () => {
    it('accepts month', () => {
      const r = parseSummaryQuery({ granularity: 'month' })
      assert.strictEqual(r.granularity, 'month')
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('accepts quarter', () => {
      const r = parseSummaryQuery({ granularity: 'quarter' })
      assert.strictEqual(r.granularity, 'quarter')
    })

    it('accepts year', () => {
      const r = parseSummaryQuery({ granularity: 'year' })
      assert.strictEqual(r.granularity, 'year')
    })

    it('rejects an unknown granularity with a field error', () => {
      const r = parseSummaryQuery({ granularity: 'week' })
      assert.ok(r.fieldErrors.groupBy, `expected groupBy error; got ${JSON.stringify(r.fieldErrors)}`)
      assert.strictEqual(r.granularity, 'month')
    })

    it('presence of granularity key flips hasFilterParams to true', () => {
      const r = parseSummaryQuery({ granularity: 'year' })
      assert.strictEqual(r.hasFilterParams, true)
    })
  })

  describe('date range', () => {
    it('open-from: only from set, to absent', () => {
      const r = parseSummaryQuery({ from: '2024-01-01' })
      assert.strictEqual(r.from, '2024-01-01')
      assert.strictEqual(r.to, undefined)
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('open-to: only to set, from absent', () => {
      const r = parseSummaryQuery({ to: '2024-12-31' })
      assert.strictEqual(r.to, '2024-12-31')
      assert.strictEqual(r.from, undefined)
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('both-set: from and to both valid', () => {
      const r = parseSummaryQuery({ from: '2024-01-01', to: '2024-12-31' })
      assert.strictEqual(r.from, '2024-01-01')
      assert.strictEqual(r.to, '2024-12-31')
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('both-absent: from and to both undefined', () => {
      const r = parseSummaryQuery({})
      assert.strictEqual(r.from, undefined)
      assert.strictEqual(r.to, undefined)
    })

    it('silently drops an invalid from date (treated as absent, no error)', () => {
      const r = parseSummaryQuery({ from: '2024-13-99' })
      assert.deepStrictEqual(r.fieldErrors, {})
      assert.strictEqual(r.from, undefined)
    })

    it('silently drops an invalid to date (treated as absent, no error)', () => {
      const r = parseSummaryQuery({ to: 'not-a-date' })
      assert.deepStrictEqual(r.fieldErrors, {})
      assert.strictEqual(r.to, undefined)
    })

    it('rejects from > to with the same date field error key as parseExpenseListFilters', () => {
      const r = parseSummaryQuery({ from: '2024-12-31', to: '2024-01-01' })
      assert.ok(r.fieldErrors.date)
    })

    it('accepts from equal to to (same day)', () => {
      const r = parseSummaryQuery({ from: '2024-06-15', to: '2024-06-15' })
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('presence of from flips hasFilterParams to true', () => {
      const r = parseSummaryQuery({ from: '2024-01-01' })
      assert.strictEqual(r.hasFilterParams, true)
    })

    it('presence of to flips hasFilterParams to true', () => {
      const r = parseSummaryQuery({ to: '2024-12-31' })
      assert.strictEqual(r.hasFilterParams, true)
    })
  })

  describe('tagIds', () => {
    it('collects a single valid ULID tagId value', () => {
      const r = parseSummaryQuery({ tagId: VALID_ULID })
      assert.deepStrictEqual(r.tagIds, [VALID_ULID])
    })

    it('accumulates multiple valid ULID tagId values into the array', () => {
      const r = parseSummaryQuery({ tagId: [VALID_ULID, VALID_ULID_2, VALID_ULID] })
      assert.deepStrictEqual(r.tagIds, [VALID_ULID, VALID_ULID_2])
    })

    it('deduplicates repeated valid ULID tagId values', () => {
      const r = parseSummaryQuery({ tagId: [VALID_ULID, VALID_ULID_2, VALID_ULID] })
      assert.deepStrictEqual(r.tagIds, [VALID_ULID, VALID_ULID_2])
    })

    it('presence of valid tagId flips hasFilterParams to true', () => {
      const r = parseSummaryQuery({ tagId: VALID_ULID })
      assert.strictEqual(r.hasFilterParams, true)
    })
  })

  describe('sort', () => {
    it('parses a single valid sort param column:direction', () => {
      const r = parseSummaryQuery({ sort: 'total:desc' })
      assert.deepStrictEqual(r.sort, [{ column: 'total', direction: 'desc' }])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('accumulates multiple sort params in order', () => {
      const r = parseSummaryQuery({ dimension: 'category', sort: ['category:asc', 'total:desc'] })
      assert.deepStrictEqual(r.sort, [
        { column: 'category', direction: 'asc' },
        { column: 'total', direction: 'desc' },
      ])
    })

    it('silently drops an unknown sort column (falls back, no error)', () => {
      const r = parseSummaryQuery({ sort: 'bogus:asc' })
      assert.deepStrictEqual(r.sort, [])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('silently drops an unknown sort direction (falls back, no error)', () => {
      const r = parseSummaryQuery({ sort: 'totalCents:sideways' })
      assert.deepStrictEqual(r.sort, [])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('presence of sort flips hasFilterParams to true', () => {
      const r = parseSummaryQuery({ sort: 'totalCents:asc' })
      assert.strictEqual(r.hasFilterParams, true)
    })
  })
})

// ====================================
// Task 4: filter-side tagId[] ULID drop + truncation, dimension-aware sort, silent invalid date drop
// ====================================

const VALID_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const VALID_ULID_2 = '01BX5ZZKBKACTAV9WEVGEMMVS0'

describe('parseExpenseListFilters — Task 4: ULID drop + cap truncation', () => {
  it('silently drops non-ULID tagId values, keeping only syntactically valid ones', () => {
    const r = parseExpenseListFilters({ tagId: [VALID_ULID, 'not-a-ulid', VALID_ULID_2] })
    assert.deepStrictEqual(r.filters.tagIds, [VALID_ULID, VALID_ULID_2])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently drops lowercase ULID values (not silently uppercased)', () => {
    const lower = VALID_ULID.toLowerCase()
    const r = parseExpenseListFilters({ tagId: [lower, VALID_ULID_2] })
    assert.deepStrictEqual(r.filters.tagIds, [VALID_ULID_2])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently drops all non-ULID tagId values without a field error', () => {
    const r = parseExpenseListFilters({ tagId: ['bad', 'also-bad', 'short'] })
    assert.deepStrictEqual(r.filters.tagIds, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('truncates tagId array to TAG_ID_RAW_CAP without erroring when cap is exceeded', () => {
    const ids = Array.from({ length: TAG_ID_RAW_CAP + 5 }, () => VALID_ULID)
    const r = parseExpenseListFilters({ tagId: ids })
    assert.ok(r.filters.tagIds.length <= TAG_ID_RAW_CAP, `expected at most ${TAG_ID_RAW_CAP} tagIds; got ${r.filters.tagIds.length}`)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('does not produce a tags field error when raw tagId count exceeds cap', () => {
    const ids = Array.from({ length: TAG_ID_RAW_CAP + 5 }, () => VALID_ULID)
    const r = parseExpenseListFilters({ tagId: ids })
    assert.strictEqual(r.fieldErrors.tags, undefined)
  })

  it('silently treats shape-correct but invalid calendar from date as absent (e.g. 2026-02-31)', () => {
    const r = parseExpenseListFilters({ from: '2026-02-31' })
    assert.strictEqual(r.filters.from, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently treats shape-correct but invalid calendar to date as absent (e.g. 2026-13-01)', () => {
    const r = parseExpenseListFilters({ to: '2026-13-01' })
    assert.strictEqual(r.filters.to, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently treats shape-correct but invalid month-zero date as absent (e.g. 2026-00-10)', () => {
    const r = parseExpenseListFilters({ from: '2026-00-10' })
    assert.strictEqual(r.filters.from, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })
})

describe('parseSummaryQuery — Task 4: ULID drop + cap truncation', () => {
  it('silently drops non-ULID tagId values, keeping only syntactically valid ones', () => {
    const r = parseSummaryQuery({ tagId: [VALID_ULID, 'not-a-ulid', VALID_ULID_2] })
    assert.deepStrictEqual(r.tagIds, [VALID_ULID, VALID_ULID_2])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently drops lowercase ULID tagId values (not silently uppercased)', () => {
    const lower = VALID_ULID.toLowerCase()
    const r = parseSummaryQuery({ tagId: [lower, VALID_ULID_2] })
    assert.deepStrictEqual(r.tagIds, [VALID_ULID_2])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently drops all non-ULID tagId values without a field error', () => {
    const r = parseSummaryQuery({ tagId: ['bad', 'also-bad'] })
    assert.deepStrictEqual(r.tagIds, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('truncates tagId array to TAG_ID_RAW_CAP without erroring when cap is exceeded', () => {
    const ids = Array.from({ length: TAG_ID_RAW_CAP + 5 }, () => VALID_ULID)
    const r = parseSummaryQuery({ tagId: ids })
    assert.ok(r.tagIds.length <= TAG_ID_RAW_CAP, `expected at most ${TAG_ID_RAW_CAP} tagIds; got ${r.tagIds.length}`)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently treats shape-correct but invalid calendar from date as absent (e.g. 2026-02-31)', () => {
    const r = parseSummaryQuery({ from: '2026-02-31' })
    assert.strictEqual(r.from, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently treats shape-correct but invalid calendar to date as absent (e.g. 2026-13-01)', () => {
    const r = parseSummaryQuery({ to: '2026-13-01' })
    assert.strictEqual(r.to, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('silently treats shape-correct but invalid month-zero date as absent (e.g. 2026-00-10)', () => {
    const r = parseSummaryQuery({ from: '2026-00-10' })
    assert.strictEqual(r.from, undefined)
    assert.deepStrictEqual(r.fieldErrors, {})
  })
})

describe('parseSummaryQuery — Task 4: dimension-aware sort allow-list', () => {
  it('sort=tag with dimension=category falls back to default (no sort entry, no error)', () => {
    const r = parseSummaryQuery({ dimension: 'category', sort: 'tag:asc' })
    assert.deepStrictEqual(r.sort, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=tag with dimension=time falls back to default (no sort entry, no error)', () => {
    const r = parseSummaryQuery({ dimension: 'time', sort: 'tag:asc' })
    assert.deepStrictEqual(r.sort, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=category with dimension=tag falls back to default (no sort entry, no error)', () => {
    const r = parseSummaryQuery({ dimension: 'tag', sort: 'category:asc' })
    assert.deepStrictEqual(r.sort, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=category with dimension=time falls back to default (no sort entry, no error)', () => {
    const r = parseSummaryQuery({ dimension: 'time', sort: 'category:asc' })
    assert.deepStrictEqual(r.sort, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=tag is valid for dimension=tag', () => {
    const r = parseSummaryQuery({ dimension: 'tag', sort: 'tag:asc' })
    assert.deepStrictEqual(r.sort, [{ column: 'tag', direction: 'asc' }])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=tag is valid for dimension=category-tag', () => {
    const r = parseSummaryQuery({ dimension: 'category-tag', sort: 'tag:desc' })
    assert.deepStrictEqual(r.sort, [{ column: 'tag', direction: 'desc' }])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=category is valid for dimension=category', () => {
    const r = parseSummaryQuery({ dimension: 'category', sort: 'category:asc' })
    assert.deepStrictEqual(r.sort, [{ column: 'category', direction: 'asc' }])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=category is valid for dimension=category-tag', () => {
    const r = parseSummaryQuery({ dimension: 'category-tag', sort: 'category:asc' })
    assert.deepStrictEqual(r.sort, [{ column: 'category', direction: 'asc' }])
    assert.deepStrictEqual(r.fieldErrors, {})
  })

  it('sort=count is valid for all dimensions', () => {
    for (const dimension of ['time', 'category', 'tag', 'category-tag'] as const) {
      const r = parseSummaryQuery({ dimension, sort: 'count:asc' })
      assert.deepStrictEqual(r.sort, [{ column: 'count', direction: 'asc' }], `failed for dimension=${dimension}`)
      assert.deepStrictEqual(r.fieldErrors, {}, `failed for dimension=${dimension}`)
    }
  })

  it('sort=total is valid for all dimensions', () => {
    for (const dimension of ['time', 'category', 'tag', 'category-tag'] as const) {
      const r = parseSummaryQuery({ dimension, sort: 'total:desc' })
      assert.deepStrictEqual(r.sort, [{ column: 'total', direction: 'desc' }], `failed for dimension=${dimension}`)
      assert.deepStrictEqual(r.fieldErrors, {}, `failed for dimension=${dimension}`)
    }
  })

  it('sort=timePeriod is valid for all dimensions', () => {
    for (const dimension of ['time', 'category', 'tag', 'category-tag'] as const) {
      const r = parseSummaryQuery({ dimension, sort: 'timePeriod:asc' })
      assert.deepStrictEqual(r.sort, [{ column: 'timePeriod', direction: 'asc' }], `failed for dimension=${dimension}`)
      assert.deepStrictEqual(r.fieldErrors, {}, `failed for dimension=${dimension}`)
    }
  })

  it('unknown sort direction falls back (no sort entry, no error)', () => {
    const r = parseSummaryQuery({ dimension: 'category', sort: 'count:sideways' })
    assert.deepStrictEqual(r.sort, [])
    assert.deepStrictEqual(r.fieldErrors, {})
  })
})

// ====================================
// parseTagInputs — Task 1a pure parser unit tests
// ====================================

const makeTag = (id: string, name: string): ExistingTag => ({ id, name })

describe('parseTagInputs (Task 1a — pure parser)', () => {
  describe('ULID syntactic validation', () => {
    it('accepts a valid Crockford-base32 ULID', () => {
      const r = parseTagInputs({ tagId: [VALID_ULID], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [VALID_ULID])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('excludes a lowercase ULID (rejected, not silently uppercased)', () => {
      const lower = VALID_ULID.toLowerCase()
      const r = parseTagInputs({ tagId: [lower], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('excludes a 25-char value (too short)', () => {
      const r = parseTagInputs({ tagId: ['01ARZ3NDEKTSV4RRFFQ69G5FA'], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [])
    })

    it('excludes a 27-char value (too long)', () => {
      const r = parseTagInputs({ tagId: ['01ARZ3NDEKTSV4RRFFQ69G5FAVX'], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [])
    })

    it('excludes a value with invalid Crockford chars (I, L, O, U)', () => {
      const r = parseTagInputs({ tagId: ['IIIIIIIIIIIIIIIIIIIIIIIIII'], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [])
    })

    it('excludes an empty string id', () => {
      const r = parseTagInputs({ tagId: [''], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [])
    })

    it('filters invalid ids while keeping valid ones', () => {
      const r = parseTagInputs({ tagId: [VALID_ULID, 'bad-id', VALID_ULID_2], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [VALID_ULID, VALID_ULID_2])
    })
  })

  describe('raw tagId count cap', () => {
    it('does not error when exactly TAG_ID_RAW_CAP ids are submitted', () => {
      const ids = Array.from({ length: TAG_ID_RAW_CAP }, () => VALID_ULID)
      const r = parseTagInputs({ tagId: ids, newTags: '' }, [])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('errors when TAG_ID_RAW_CAP + 1 ids are submitted (even if dedupe yields one)', () => {
      const ids = Array.from({ length: TAG_ID_RAW_CAP + 1 }, () => VALID_ULID)
      const r = parseTagInputs({ tagId: ids, newTags: '' }, [])
      assert.ok(r.fieldErrors.tags, `expected tags error; got ${JSON.stringify(r.fieldErrors)}`)
    })
  })

  describe('deduplication after syntactic filtering', () => {
    it('deduplicates repeated valid ids', () => {
      const r = parseTagInputs({ tagId: [VALID_ULID, VALID_ULID, VALID_ULID_2], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [VALID_ULID, VALID_ULID_2])
    })
  })

  describe('newTags parsing', () => {
    it('splits on comma separator', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo,bar' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar'])
    })

    it('splits on space separator', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo bar' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar'])
    })

    it('splits on comma+space', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo, bar' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar'])
    })

    it('splits on double comma', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo,,bar' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar'])
    })

    it('splits on newline separator', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo\nbar' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar'])
    })

    it('splits on comma+spaces with leading/trailing', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo,  bar , baz' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar', 'baz'])
    })

    it('lowercases tokens', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'Foo Bar' }, [])
      assert.deepStrictEqual(r.newTags, ['foo', 'bar'])
    })

    it('drops empty tokens', () => {
      const r = parseTagInputs({ tagId: [], newTags: '  ,  , ' }, [])
      assert.deepStrictEqual(r.newTags, [])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('rejects a token failing the regex (invalid char)', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'valid,inv@lid' }, [])
      assert.ok(r.fieldErrors.tags, `expected tags error; got ${JSON.stringify(r.fieldErrors)}`)
    })

    it('rejects a token that is 21 characters (over the 20-char limit)', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'a'.repeat(21) }, [])
      assert.ok(r.fieldErrors.tags, `expected tags error; got ${JSON.stringify(r.fieldErrors)}`)
    })

    it('accepts a token of exactly 20 characters', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'a'.repeat(20) }, [])
      assert.deepStrictEqual(r.fieldErrors, {})
      assert.deepStrictEqual(r.newTags, ['a'.repeat(20)])
    })

    it('accepts a single character token', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'a' }, [])
      assert.deepStrictEqual(r.newTags, ['a'])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('accepts tokens with hyphens and underscores', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo-bar_baz' }, [])
      assert.deepStrictEqual(r.newTags, ['foo-bar_baz'])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('deduplicates tokens case-insensitively', () => {
      const r = parseTagInputs({ tagId: [], newTags: 'foo Foo FOO' }, [])
      assert.deepStrictEqual(r.newTags, ['foo'])
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('errors when raw newTags string exceeds NEW_TAGS_RAW_LENGTH_CAP', () => {
      const longInput = 'a,'.repeat(NEW_TAGS_RAW_LENGTH_CAP)
      const r = parseTagInputs({ tagId: [], newTags: longInput }, [])
      assert.ok(r.fieldErrors.tags, `expected tags error; got ${JSON.stringify(r.fieldErrors)}`)
    })

    it('preserves raw newTags text verbatim on validation error', () => {
      const raw = 'valid,inv@lid'
      const r = parseTagInputs({ tagId: [], newTags: raw }, [])
      assert.ok(r.fieldErrors.tags)
      assert.strictEqual(r.rawNewTagsPreserved, raw)
    })

    it('errors when post-split token count exceeds NEW_TAGS_TOKEN_COUNT_CAP', () => {
      const tokens = Array.from({ length: NEW_TAGS_TOKEN_COUNT_CAP + 1 }, (_, i) => `tag${i}`)
      const r = parseTagInputs({ tagId: [], newTags: tokens.join(',') }, [])
      assert.ok(r.fieldErrors.tags, `expected tags error; got ${JSON.stringify(r.fieldErrors)}`)
    })
  })

  describe('newTags collision with existing tag names', () => {
    it('folds a newTags token matching an existing tag name into tagIds', () => {
      const existing = [makeTag(VALID_ULID, 'food')]
      const r = parseTagInputs({ tagId: [], newTags: 'food' }, existing)
      assert.ok(r.tagIds.includes(VALID_ULID), `expected ${VALID_ULID} in tagIds; got ${JSON.stringify(r.tagIds)}`)
      assert.deepStrictEqual(r.newTags, [])
    })

    it('matching is case-insensitive: typed "Food" matches existing "food"', () => {
      const existing = [makeTag(VALID_ULID, 'food')]
      const r = parseTagInputs({ tagId: [], newTags: 'Food' }, existing)
      assert.ok(r.tagIds.includes(VALID_ULID))
      assert.deepStrictEqual(r.newTags, [])
    })

    it('attaches existing tag exactly once even if also chip-selected', () => {
      const existing = [makeTag(VALID_ULID, 'food')]
      const r = parseTagInputs({ tagId: [VALID_ULID], newTags: 'food' }, existing)
      assert.strictEqual(r.tagIds.filter((id: string) => id === VALID_ULID).length, 1)
      assert.deepStrictEqual(r.newTags, [])
    })

    it('residual newTags contains only unresolved tokens', () => {
      const existing = [makeTag(VALID_ULID, 'food')]
      const r = parseTagInputs({ tagId: [], newTags: 'food,travel' }, existing)
      assert.deepStrictEqual(r.newTags, ['travel'])
      assert.ok(r.tagIds.includes(VALID_ULID))
    })

    it('replaces rawNewTagsPreserved with normalized residual on success', () => {
      const existing = [makeTag(VALID_ULID, 'food')]
      const r = parseTagInputs({ tagId: [], newTags: 'food,travel' }, existing)
      assert.deepStrictEqual(r.fieldErrors, {})
      assert.strictEqual(r.rawNewTagsPreserved, 'travel')
    })
  })

  describe('lookupCandidateTagIds vs final tagIds', () => {
    it('lookupCandidateTagIds contains only syntactically-valid ids before any DB lookup', () => {
      const r = parseTagInputs({ tagId: [VALID_ULID, 'not-a-ulid', VALID_ULID_2], newTags: '' }, [])
      assert.deepStrictEqual(r.lookupCandidateTagIds, [VALID_ULID, VALID_ULID_2])
    })
  })
})

// ====================================
// parseCategoryInput — Task 1a categoryId parallel block
// ====================================

describe('parseCategoryInput (Task 1a — categoryId parallel block)', () => {
  describe('categoryId syntactic validation', () => {
    it('accepts a valid Crockford-base32 ULID for categoryId', () => {
      const r = parseCategoryInput({ categoryId: VALID_ULID, newCategory: '' }, null)
      assert.strictEqual(r.lookupCandidateCategoryId, VALID_ULID)
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('excludes a lowercase categoryId (not silently uppercased)', () => {
      const lower = VALID_ULID.toLowerCase()
      const r = parseCategoryInput({ categoryId: lower, newCategory: '' }, null)
      assert.strictEqual(r.lookupCandidateCategoryId, undefined)
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('excludes a non-ULID categoryId', () => {
      const r = parseCategoryInput({ categoryId: 'not-a-ulid', newCategory: '' }, null)
      assert.strictEqual(r.lookupCandidateCategoryId, undefined)
    })

    it('treats absent categoryId as no lookup candidate', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: '' }, null)
      assert.strictEqual(r.lookupCandidateCategoryId, undefined)
    })
  })

  describe('newCategory name validation', () => {
    it('accepts a valid new-category name', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: 'groceries' }, null)
      assert.strictEqual(r.newCategory, 'groceries')
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('trims and lowercases the new-category name', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: '  Groceries  ' }, null)
      assert.strictEqual(r.newCategory, 'groceries')
    })

    it('rejects a name with invalid chars (per ^[a-z0-9_-]{1,20}$ after lowercase)', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: 'inv@lid!' }, null)
      assert.ok(r.fieldErrors.category, `expected category error; got ${JSON.stringify(r.fieldErrors)}`)
    })

    it('rejects a name that is 21 characters (over limit)', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: 'a'.repeat(21) }, null)
      assert.ok(r.fieldErrors.category, `expected category error; got ${JSON.stringify(r.fieldErrors)}`)
    })

    it('accepts a name of exactly 20 characters', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: 'a'.repeat(20) }, null)
      assert.deepStrictEqual(r.fieldErrors, {})
      assert.strictEqual(r.newCategory, 'a'.repeat(20))
    })

    it('folds newCategory matching existing category name into categoryId', () => {
      const existing: ExistingCategory = { id: VALID_ULID, name: 'food' }
      const r = parseCategoryInput({ categoryId: '', newCategory: 'food' }, existing)
      assert.strictEqual(r.resolvedCategoryId, VALID_ULID)
      assert.strictEqual(r.newCategory, undefined)
      assert.deepStrictEqual(r.fieldErrors, {})
    })

    it('fold is case-insensitive: "Food" matches existing "food"', () => {
      const existing: ExistingCategory = { id: VALID_ULID, name: 'food' }
      const r = parseCategoryInput({ categoryId: '', newCategory: 'Food' }, existing)
      assert.strictEqual(r.resolvedCategoryId, VALID_ULID)
      assert.strictEqual(r.newCategory, undefined)
    })

    it('treats empty newCategory as absent (no new-category entry)', () => {
      const r = parseCategoryInput({ categoryId: '', newCategory: '  ' }, null)
      assert.strictEqual(r.newCategory, undefined)
      assert.deepStrictEqual(r.fieldErrors, {})
    })
  })
})
