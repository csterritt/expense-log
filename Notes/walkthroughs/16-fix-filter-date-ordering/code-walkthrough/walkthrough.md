# Issue 16: Fix filter date ordering — code walkthrough

*2026-05-21T13:53:21Z by Showboat 0.6.1*
<!-- showboat-id: 43497f7c-01cb-4bf4-a9d6-a94248777a23 -->

## Overview

Issue 16 fixes an inconsistency in the expense-list filter validator. parseExpenseListFilters validated 'from' and 'to' dates independently but did not reject a range where 'from' is after 'to'. This meant a user could submit an impossible date range and receive an empty list with no error. parseSummaryQuery already had the correct guard — this walkthrough shows how the fix was applied to parseExpenseListFilters and what tests were added.

## The fix in src/lib/expense-validators.ts

After both 'from' and 'to' are individually parsed and validated as YYYY-MM-DD, the new guard fires only when both are defined and valid. It preserves any earlier format error (so a bad-format 'from' date doesn't get overwritten). The message exactly mirrors parseSummaryQuery.

```bash
sed -n '718,724p' src/lib/expense-validators.ts
```

```output
  }

  if (from !== undefined && to !== undefined && from > to) {
    fieldErrors.date = fieldErrors.date ? fieldErrors.date : 'From date must be on or before To date.'
  }

  let tagMode: 'or' | 'and' = 'or'
```

This is the complete new guard. It is 3 lines and conditions on both 'from' and 'to' being defined (i.e. both having passed individual format validation). If 'from' is already undefined due to a bad format, the check is skipped entirely, so the format error is preserved rather than being overwritten.

## The existing guard in parseSummaryQuery (reference)

For comparison, here is the identical guard that already existed in parseSummaryQuery, which this change mirrors.

```bash
sed -n '839,843p' src/lib/expense-validators.ts
```

```output
        : 'To date must be a valid date (YYYY-MM-DD).'
    }
  }

  if (from > to) {
```

```bash
sed -n '839,845p' src/lib/expense-validators.ts
```

```output
        : 'To date must be a valid date (YYYY-MM-DD).'
    }
  }

  if (from > to) {
    fieldErrors.date = fieldErrors.date
      ? fieldErrors.date
```

parseSummaryQuery uses 'from > to' without the undefined guards because its from/to always have defaults from defaultRangeEt(), so they are never undefined. parseExpenseListFilters has optional from/to, hence the additional undefined checks.

## The new tests in tests/expense-validators.spec.ts

Five cases were added to the existing 'parseExpenseListFilters (Issue 11)' describe block.

```bash
sed -n '612,639p' tests/expense-validators.spec.ts
```

```output
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
```

The five cases cover: (1) reversed range → error; (2) same-day → no error, both dates returned; (3) only from set → no error; (4) only to set → no error; (5) bad format for from + valid to → format error wins, from is undefined.

## Test run verification

Running the full expense-validators spec to confirm all 122 tests pass.

```bash
bun test tests/expense-validators.spec.ts 2>&1 | tail -5
```

```output
(pass) parseRecurringCreate > multiple errors > returns errors for all invalid fields simultaneously [0.07ms]

 122 pass
 0 fail
Ran 122 tests across 1 file. [44.00ms]
```
