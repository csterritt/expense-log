# Issue 02 — Expense List View Rendering

*2026-04-24T23:33:30Z by Showboat 0.6.1*
<!-- showboat-id: 1a8d0e1d-f3b8-4756-b3d3-768ce7fe3943 -->

This walkthrough demonstrates Issue 02: turning the placeholder /expenses page into a real list view. New library modules `money` (formatCents) and `et-date` (todayEt, defaultRangeEt, isValidYmd), the `listExpenses` query in a new `expense-repo` module, a test-only seed-expenses route, the matching e2e helper, and the table rendering on /expenses.

## 1. money.formatCents — exact dollar formatting from cents

```bash
cat src/lib/money.ts
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Money formatting utilities.
 * @module lib/money
 */

const FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
})

/**
 * Format an integer amount in cents as a US-English dollar string with
 * comma thousands separators and exactly two decimal places.
 *
 * Examples: 0 -> "0.00", 100 -> "1.00", 123456 -> "1,234.56".
 *
 * @param cents - Integer amount in cents (may be negative)
 * @returns Formatted string, e.g. "1,234.56"
 */
export const formatCents = (cents: number): string => {
  const whole = Math.trunc(cents / 100)
  const fraction = Math.abs(cents % 100)
  const sign = cents < 0 && whole === 0 ? '-' : ''
  const wholeStr = FORMATTER.format(whole).split('.')[0]
  const fracStr = fraction.toString().padStart(2, '0')
  return `${sign}${wholeStr}.${fracStr}`
}
```

Unit tests verify the boundary cases the issue called out:

```bash
bun test tests/money.spec.ts 2>&1 | tail -15
```

```output
bun test v1.3.13 (bf2e2cec)

tests/money.spec.ts:
(pass) formatCents > formats 0 as 0.00
(pass) formatCents > formats 1 as 0.01
(pass) formatCents > formats 99 as 0.99
(pass) formatCents > formats 100 as 1.00
(pass) formatCents > formats 12345 as 123.45
(pass) formatCents > formats 123456 as 1,234.56
(pass) formatCents > formats 100000000 as 1,000,000.00

 7 pass
 0 fail
Ran 7 tests across 1 file. [41.00ms]
```

## 2. et-date — America/New_York date helpers

Built on `Intl.DateTimeFormat({ timeZone: 'America/New_York' })` so it works on Cloudflare Workers without external dependencies. `todayEt` and `defaultRangeEt` accept an optional reference `Date` for testability, mirroring the injection pattern in `time-access.ts`.

```bash
cat src/lib/et-date.ts
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * America/New_York date utilities. All dates are `YYYY-MM-DD` strings.
 * Uses `Intl.DateTimeFormat` so this works on Cloudflare Workers without
 * extra deps.
 * @module lib/et-date
 */

const ET_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Current date in `America/New_York` formatted as `YYYY-MM-DD`.
 * Accepts an optional reference `Date` for testability.
 */
export const todayEt = (reference?: Date): string => {
  const d = reference ?? new Date()
  // en-CA yields YYYY-MM-DD
  return ET_FORMATTER.format(d)
}

/**
 * Default date range for the expense list view.
 *
 * Returns `{ from, to }` where `to` is `todayEt(reference)` and `from` is
 * the first of the month two months before that ET date.
 */
export const defaultRangeEt = (reference?: Date): { from: string; to: string } => {
  const to = todayEt(reference)
  const [yStr, mStr] = to.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10) // 1-12
  // Go back two months
  let fromMonth = month - 2
  let fromYear = year
  while (fromMonth < 1) {
    fromMonth += 12
    fromYear -= 1
  }
  const from = `${fromYear.toString().padStart(4, '0')}-${fromMonth.toString().padStart(2, '0')}-01`
  return { from, to }
}

/**
 * Return true iff `s` is a valid calendar date formatted as `YYYY-MM-DD`.
 */
export const isValidYmd = (s: string): boolean => {
  const m = YMD_RE.exec(s)
  if (!m) {
    return false
  }
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (month < 1 || month > 12) {
    return false
  }
  if (day < 1 || day > 31) {
    return false
  }
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  )
}
```

```bash
bun test tests/et-date.spec.ts 2>&1 | tail -25
```

```output

tests/et-date.spec.ts:
(pass) todayEt > returns ET date just before EST->EDT spring-forward boundary
(pass) todayEt > returns ET date just after EST->EDT spring-forward boundary
(pass) todayEt > returns ET date just before EDT->EST fall-back boundary
(pass) todayEt > returns ET date just after EDT->EST fall-back boundary
(pass) todayEt > handles the UTC->ET rollback across midnight
(pass) defaultRangeEt > wraps year when todayEt is in January
(pass) defaultRangeEt > wraps year when todayEt is in February
(pass) defaultRangeEt > produces January 1 from March 1
(pass) defaultRangeEt > produces October 1 from December 15
(pass) isValidYmd > accepts a valid leap day
(pass) isValidYmd > rejects a leap day in a non-leap year [1.00ms]
(pass) isValidYmd > rejects month 13
(pass) isValidYmd > rejects April 31
(pass) isValidYmd > rejects empty string
(pass) isValidYmd > rejects missing dashes
(pass) isValidYmd > rejects trailing garbage
(pass) isValidYmd > rejects short year
(pass) isValidYmd > rejects single-digit month
(pass) isValidYmd > accepts ordinary dates

 19 pass
 0 fail
Ran 19 tests across 1 file. [41.00ms]
```

## 3. expense-repo.listExpenses — date-filtered query with tag join

Joins expense to category for the category name, applies an inclusive date range, and sorts by date desc with a case-insensitive description tiebreak (`lower(description) asc`). Tag names are gathered with a single secondary query over expenseTag join tag, grouped into a Map by expenseId.

```bash
cat src/lib/expense-repo.ts
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `expense` table and its joins.
 * @module lib/expense-repo
 */
import { Context } from 'hono'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { createDbClient } from '../db/client'
import { category, expense, expenseTag, tag } from '../db/schema'
import type { Bindings } from '../local-types'

export interface ExpenseRow {
  id: string
  date: string
  description: string
  categoryName: string
  amountCents: number
  tagNames: string[]
}

export interface ListExpenseFilters {
  from: string
  to: string
}

/**
 * List expenses whose `date` is within `[from, to]` inclusive.
 *
 * Results are sorted by `date DESC` then case-insensitive `description ASC`.
 * Tag names (if any) are returned alongside each row in their natural
 * ordering from the join (no duplication).
 */
export const listExpenses = async (
  c: Context<{ Bindings: Bindings }>,
  filters: ListExpenseFilters,
): Promise<ExpenseRow[]> => {
  const db = createDbClient(c.env.PROJECT_DB)

  const rows = await db
    .select({
      id: expense.id,
      date: expense.date,
      description: expense.description,
      amountCents: expense.amountCents,
      categoryName: category.name,
    })
    .from(expense)
    .innerJoin(category, eq(category.id, expense.categoryId))
    .where(and(gte(expense.date, filters.from), lte(expense.date, filters.to)))
    .orderBy(desc(expense.date), asc(sql`lower(${expense.description})`))

  if (rows.length === 0) {
    return []
  }

  const tagsByExpenseId = new Map<string, string[]>()
  const tagRows = await db
    .select({ expenseId: expenseTag.expenseId, tagName: tag.name })
    .from(expenseTag)
    .innerJoin(tag, eq(tag.id, expenseTag.tagId))

  for (const row of tagRows) {
    const bucket = tagsByExpenseId.get(row.expenseId)
    if (bucket) {
      bucket.push(row.tagName)
    } else {
      tagsByExpenseId.set(row.expenseId, [row.tagName])
    }
  }

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    categoryName: row.categoryName,
    amountCents: row.amountCents,
    tagNames: tagsByExpenseId.get(row.id) ?? [],
  }))
}
```

## 4. Test-only seed-expenses route

Mounted alongside the existing /test/database routes (so it is gated by isTestRouteEnabledFlag and stripped in production via PRODUCTION:REMOVE comments). Accepts `{ date, description, amountCents, categoryName, tagNames? }` rows and creates categories and tags on the fly via case-insensitive lookup.

```bash
sed -n '294,381p' src/routes/test/database.ts
```

```output
/**
 * Seed the database with expenses for testing list rendering
 * POST /test/database/seed-expenses
 */
// PRODUCTION:REMOVE
interface SeedExpenseInput {
  date: string
  description: string
  amountCents: number
  categoryName: string
  tagNames?: string[]
}

testDatabaseRouter.post('/seed-expenses', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.PROJECT_DB)

    const body = (await c.req.json()) as SeedExpenseInput[]
    if (!Array.isArray(body)) {
      return c.json({ success: false, error: 'Body must be a JSON array' }, 400)
    }

    const now = new Date()
    const categoryIdByLower = new Map<string, string>()
    const tagIdByLower = new Map<string, string>()

    const existingCategories = await db.select().from(category)
    for (const row of existingCategories) {
      categoryIdByLower.set(row.name.toLowerCase(), row.id)
    }
    const existingTags = await db.select().from(tag)
    for (const row of existingTags) {
      tagIdByLower.set(row.name.toLowerCase(), row.id)
    }

    let created = 0
    for (const row of body) {
      const catKey = row.categoryName.toLowerCase()
      let categoryId = categoryIdByLower.get(catKey)
      if (!categoryId) {
        categoryId = crypto.randomUUID()
        await db
          .insert(category)
          .values({ id: categoryId, name: row.categoryName, createdAt: now, updatedAt: now })
        categoryIdByLower.set(catKey, categoryId)
      }

      const expenseId = crypto.randomUUID()
      await db.insert(expense).values({
        id: expenseId,
        description: row.description,
        amountCents: row.amountCents,
        categoryId,
        date: row.date,
        createdAt: now,
        updatedAt: now,
      })

      const tagNames = row.tagNames ?? []
      for (const tagName of tagNames) {
        const tagKey = tagName.toLowerCase()
        let tagId = tagIdByLower.get(tagKey)
        if (!tagId) {
          tagId = crypto.randomUUID()
          await db
            .insert(tag)
            .values({ id: tagId, name: tagName, createdAt: now, updatedAt: now })
          tagIdByLower.set(tagKey, tagId)
        }
        await db.insert(expenseTag).values({ expenseId, tagId })
      }

      created += 1
    }

    return c.json({ success: true, created })
  } catch (error) {
    console.error('Failed to seed expenses:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to seed expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})
```

## 5. seedExpenses e2e helper

```bash
sed -n '94,133p' e2e-tests/support/db-helpers.ts
```

```output
export interface SeedExpenseRow {
  date: string
  description: string
  amountCents: number
  categoryName: string
  tagNames?: string[]
}

/**
 * Seed database with a list of expenses (plus any needed categories/tags)
 * Calls test-only server endpoint to insert rows directly.
 */
export const seedExpenses = async (rows: SeedExpenseRow[]): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      created?: number
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed expenses')
    }

    console.log(`Expenses seeded successfully: ${result.created} created`)
  } catch (error) {
    console.error('Failed to seed expenses:', error)
    throw error
  }
}
```

## 6. /expenses now renders the list

```bash
cat src/routes/expenses/build-expenses.tsx
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expenses list page.
 * @module routes/expenses/buildExpenses
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { defaultRangeEt } from '../../lib/et-date'
import { listExpenses, type ExpenseRow } from '../../lib/expense-repo'
import { formatCents } from '../../lib/money'

const renderExpenseTable = (rows: ExpenseRow[]) => {
  return (
    <div className='overflow-x-auto'>
      <table className='table table-zebra w-full' data-testid='expenses-table'>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Tags</th>
            <th className='text-right'>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr data-testid='expense-row' data-expense-id={row.id}>
              <td data-testid='expense-row-date'>{row.date}</td>
              <td data-testid='expense-row-description'>{row.description}</td>
              <td data-testid='expense-row-category'>{row.categoryName}</td>
              <td data-testid='expense-row-tags'>{row.tagNames.join(', ')}</td>
              <td className='text-right' data-testid='expense-row-amount'>
                {formatCents(row.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const renderExpenses = (rows: ExpenseRow[]) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {rows.length === 0 ? (
        <p className='text-gray-600' data-testid='expenses-empty-state'>
          No expenses yet
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
    </div>
  )
}

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const range = defaultRangeEt()
      const rows = await listExpenses(c, range)
      return c.render(useLayout(c, renderExpenses(rows)))
    },
  )
}
```

## 7. End-to-end coverage proves the slice

The Playwright spec seeds five expenses (two same-day, plus one each at 1, 2, and 4 months back) and verifies rendering on /expenses: ordering by date desc with case-insensitive description tiebreak, formatCents output, the tag join, and out-of-window exclusion. The spec lives at e2e-tests/expenses/01-list-rendering.spec.ts and runs against the dev server with seed-expenses enabled.

```bash
wc -l e2e-tests/expenses/01-list-rendering.spec.ts && head -60 e2e-tests/expenses/01-list-rendering.spec.ts
```

```output
125 e2e-tests/expenses/01-list-rendering.spec.ts
import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

/**
 * Returns the current date in `America/New_York` as `YYYY-MM-DD`.
 * Matches the behaviour of `src/lib/et-date.ts` `todayEt`.
 */
const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

/** Offset the given `YYYY-MM-DD` by a number of months, clamped to day-15 for safety. */
const ymdMonthsAgo = (today: string, months: number, day: number): string => {
  const [yStr, mStr] = today.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10) // 1-12
  let newMonth = month - months
  let newYear = year
  while (newMonth < 1) {
    newMonth += 12
    newYear -= 1
  }
  return `${newYear.toString().padStart(4, '0')}-${newMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

test.describe('Expenses list rendering', () => {
  test(
    'renders only in-window expenses, sorted date desc then case-insensitive description asc',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      const thisMonthEarly = ymdMonthsAgo(today, 0, 5)
      const thisMonthEarlySame = ymdMonthsAgo(today, 0, 5)
      const oneMonthBack = ymdMonthsAgo(today, 1, 15)
      const twoMonthsBack = ymdMonthsAgo(today, 2, 10)
      const outsideWindow = ymdMonthsAgo(today, 4, 1)

      // Two expenses on the same date to exercise the case-insensitive
      // description tiebreak (alpha comes before beta regardless of case).
      await seedExpenses([
        {
          date: thisMonthEarly,
          description: 'beta lunch',
          amountCents: 123456,
          categoryName: 'Food',
          tagNames: ['work', 'client'],
        },
        {
          date: thisMonthEarlySame,
          description: 'Alpha breakfast',
          amountCents: 100,
          categoryName: 'Food',
        },
```
