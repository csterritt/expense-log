# Issue 14: Recurrence Materialization — Code Walkthrough

*2026-05-20T17:24:49Z by Showboat 0.6.1*
<!-- showboat-id: 0328a2f6-c03b-4ddf-a188-3ed7e4c04a21 -->

## Overview

Issue 14 implements the **recurring-expense materialization engine** for expense-log.  It consists of:

1. A pure calendar-arithmetic library () that computes when occurrences are due.
2. Two DB helpers in  that atomically insert generated expenses.
3. A dev-only cron trigger () for driving the engine during e2e tests.
4. A UI badge (↻) rendered on the  list for generated rows.

All changes are backward-compatible: manually-entered expenses are unaffected.

## Overview

Issue 14 implements the recurring-expense materialization engine for expense-log. It consists of:

1. A pure calendar-arithmetic library (src/lib/recurrence.ts) that computes when occurrences are due.
2. Two DB helpers in src/lib/db/expense-access.ts that atomically insert generated expenses.
3. A dev-only cron trigger (POST /test/run-cron) for driving the engine during e2e tests.
4. A UI badge rendered on the /expenses list for generated rows.

All changes are backward-compatible: manually-entered expenses are unaffected.

## 1. Recurrence Algorithm — src/lib/recurrence.ts

### nextOccurrenceAfter

The core primitive. Given a date `after`, a recurrence frequency, and an
anchor date (which provides the day-of-month reference), it returns the
next occurrence date as a YYYY-MM-DD string.

Key rules:
- Result is STRICTLY after `after` (i.e. anchor day == after day still
  advances to the next period).
- 28th-shift: if the anchor day exceeds the number of days in the target
  month, the result is clamped to the last day of that month.
  Example: anchor = Jan 31, next month = February -> Feb 28 (or Feb 29
  in a leap year).

Supported frequencies:
- Monthly  — advance by 1 calendar month
- Quarterly — advance by 3 calendar months
- Yearly   — advance by 1 calendar year

### occurrencesToGenerate

Higher-level helper called by materializeOneRecurring. Computes all
occurrence dates that belong in the DB for a given template on a given
run-day (`today`).

Parameters:
- anchorDate, recurrence — from the template row
- createdAt (Date)       — template creation timestamp; converted to ET
- lastOccurrence?        — most-recent already-inserted date (or null)
- today                  — ceiling date for this materialization run

First-occurrence rule: the very first valid occurrence is
nextOccurrenceAfter(max(createdAt_ET, anchorDate)); this means the
occurrence matching the anchor date itself is never generated — only
future occurrences are. This prevents double-counting for templates
created on their anchor day.

Lower bound: max(createdAt_ET, lastOccurrence ?? '').
Upper bound: today (inclusive).

Returns a sorted string[] of YYYY-MM-DD dates to insert.

```bash
sed -n '31,100p' src/lib/recurrence.ts
```

```output
/**
 * Return the next occurrence date strictly after `after` for the given
 * recurrence rule and anchor date.
 *
 * **Monthly**: returns the next `YYYY-MM-DD` strictly after `after` whose
 * day-of-month equals the anchor day. If the anchor day exceeds the last
 * day of the target month the day is clamped to that last day (the
 * "28th-shift rule": anchor 29/30/31 in a non-leap February → Feb 28;
 * anchor 31 in April → Apr 30; etc.).
 *
 * **Quarterly**: returns the next `YYYY-MM-DD` strictly after `after` in the
 * same quarterly cycle as the anchor (i.e. every 3 months from the anchor
 * month). The anchor day is clamped to the target month's last day.
 *
 * **Yearly**: returns the next `YYYY-MM-DD` strictly after `after` that falls
 * on the same month and day as the anchor (in a later year). The anchor day
 * is clamped to the target month's last day (e.g. Feb 29 anchor → Feb 28 in
 * non-leap years; May 31 anchor → May 31 in any year).
 *
 * The 28th-shift rule applies to all recurrences: any anchor day in
 * {29, 30, 31} that exceeds the number of days in the target month is
 * clamped to `min(anchorDay, daysInMonth)`.
 *
 * Inputs are validated to be valid `YYYY-MM-DD` calendar dates; malformed
 * or impossible inputs (e.g. `2025-02-30`) throw a plain `Error` with a
 * helpful message.
 *
 * @param recurrence - Recurrence frequency
 * @param anchorDate - YYYY-MM-DD anchor date
 * @param after - YYYY-MM-DD date; the result is strictly after this value
 * @returns YYYY-MM-DD string of the next occurrence
 */
export const nextOccurrenceAfter = ({
  recurrence,
  anchorDate,
  after,
}: {
  recurrence: 'Monthly' | 'Quarterly' | 'Yearly'
  anchorDate: string
  after: string
}): string => {
  if (!isValidYmd(anchorDate)) {
    throw new Error(
      `nextOccurrenceAfter: invalid anchorDate "${anchorDate}" (expected YYYY-MM-DD)`,
    )
  }
  if (!isValidYmd(after)) {
    throw new Error(`nextOccurrenceAfter: invalid after "${after}" (expected YYYY-MM-DD)`)
  }

  if (recurrence === 'Monthly') {
    const [, , anchorDay] = parseYmd(anchorDate)
    const [afterYear, afterMonth] = parseYmd(after)

    // Try the occurrence in the same month as `after`.
    let year = afterYear
    let month = afterMonth
    const dims = daysInMonthFor(year, month)
    const clampedDay = Math.min(anchorDay, dims)
    const candidate = formatYmd(year, month, clampedDay)

    if (candidate > after) {
      return candidate
    }

    // Occurrence in the same month is not strictly after `after`; advance
    // to the next month.
    month += 1
    if (month > 12) {
      month = 1
```

## 2. Materialization Helpers — src/lib/db/expense-access.ts

### materializeOneRecurring

Called once per template. Uses occurrencesToGenerate to determine which
dates need rows, then inserts each with the expense's category, amount,
and a copy of the template's tags. Idempotency is guaranteed by the
database schema: a unique partial index on (recurringId, occurrenceDate)
means duplicate inserts are silently ignored (ON CONFLICT DO NOTHING).

Returns { generated, skipped } where skipped > 0 only if the DB
constraint fires (rare in practice because occurrencesToGenerate already
uses the max(occurrenceDate) lower bound to avoid re-attempting known
rows).

### materializeRecurring (public)

Aggregator called by the cron route. Fetches all active templates,
iterates them calling materializeOneRecurring, accumulates totals, and
error-isolates failures per template: a bad template is added to the
`failed[]` list but the others continue. Returns a summary object
{ generated, skipped, failed }.

```bash
sed -n '1350,1420p' src/lib/db/expense-access.ts
```

```output

    const tagsByRecurringId = new Map<string, { id: string; name: string }[]>()
    for (const row of tagRows) {
      const bucket = tagsByRecurringId.get(row.recurringId)
      if (bucket) {
        bucket.push({ id: row.tagId, name: row.tagName })
      } else {
        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
      }
    }

    return rows.map((row) => {
      const tags = (tagsByRecurringId.get(row.id) ?? []).slice()
      tags.sort((a, b) => a.name.localeCompare(b.name))
      return {
        id: row.id,
        description: row.description,
        amountCents: row.amountCents,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        recurrence: row.recurrence,
        anchorDate: row.anchorDate,
        createdAt: row.createdAt,
        tagIds: tags.map((t) => t.id),
        tagNames: tags.map((t) => t.name),
      }
    })
  })
}

/**
 * Insert all pending occurrence rows for a single recurring template.
 *
 * For each date in `occurrencesToGenerate`, inserts one `expense` row
 * (with `recurringId` and `occurrenceDate` set) plus the corresponding
 * `expenseTag` links. A unique-index violation on `(recurringId, occurrenceDate)`
 * is treated as a no-op and counted as `skipped`; all other errors are
 * re-thrown.
 *
 * @param db - Database instance
 * @param template - Resolved recurring template with tagIds and createdAt
 * @param today - YYYY-MM-DD current date (ET-anchored, inclusive upper bound)
 * @returns Counts of newly generated and skipped (already-existing) occurrences
 */
const materializeOneRecurring = async (
  db: DrizzleClient,
  template: RecurringForMaterialize,
  today: string,
): Promise<{ generated: number; skipped: number }> => {
  const createdAtYmd = todayEt(template.createdAt)

  const lastOccurrenceRows = await db
    .select({ maxDate: sql<string | null>`max(${expense.occurrenceDate})` })
    .from(expense)
    .where(eq(expense.recurringId, template.id))

  const lastOccurrence = lastOccurrenceRows[0]?.maxDate ?? undefined

  const dates = occurrencesToGenerate({
    recurrence: template.recurrence as 'Monthly' | 'Quarterly' | 'Yearly',
    anchorDate: template.anchorDate,
    createdAt: createdAtYmd,
    lastOccurrence,
    today,
  })

  let generated = 0
  let skipped = 0
  const now = new Date()

  for (const occurrenceDate of dates) {
```

## 3. Dev Cron Route — src/routes/test/run-cron.ts

when isTestRouteEnabled returns true. It is the main test handle for
triggering materialization on demand during Playwright e2e runs.

Flow:
1. Middleware: secureHeaders + signedInAccess (requires valid session).
2. Computes today = todayEt(getCurrentTime(c)).
   getCurrentTime reads the 'clock-delta' cookie set by /auth/set-clock/:delta,
   so Playwright tests can control the apparent date by navigating to that URL.
3. Calls materializeRecurring(db, today).
4. Returns JSON { today, generated, skipped, failed } or { error } on failure.

This pattern (set-clock -> POST run-cron -> assert expenses) is used in
all four recurring e2e materialization specs (05–08).

```bash
cat src/routes/test/run-cron.ts
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Development-only cron trigger route.
 * Allows manual triggering of the recurring-expense materialization job.
 * @module routes/test/run-cron
 */

import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { createDbClient } from '../../db/client'
import { materializeRecurring } from '../../lib/db/expense-access'
import { todayEt } from '../../lib/et-date'
import { getCurrentTime } from '../../lib/time-access'
import { signedInAccess } from '../../middleware/signed-in-access'
import { STANDARD_SECURE_HEADERS } from '../../constants'

export const testRunCronRouter = new Hono<{ Bindings: { PROJECT_DB: D1Database } }>()

testRunCronRouter.post(
  '/run-cron',
  secureHeaders(STANDARD_SECURE_HEADERS),
  signedInAccess,
  async (c) => {
    const db = createDbClient(c.env.PROJECT_DB)
    const today = todayEt(getCurrentTime(c))
    const result = await materializeRecurring(db, today)
    if (result.isErr) {
      return c.json({ error: result.error.message }, 500)
    }
    return c.json({
      today,
      generated: result.value.generated,
      skipped: result.value.skipped,
      failed: result.value.failed,
    })
  },
)
```

## 4. UI Badge Rendering — src/routes/expenses/expense-list-renderer.tsx

The description cell in the expense table now checks the row's recurringId.
When it is non-null the description is wrapped in an underlined span and
a small badge is appended after it.

Badge markup pattern:
  <td data-testid="expense-row-description">
    <span class="underline">Coffee subscription</span>
    <span data-testid="expense-row-recurring-badge"
          class="..."
          title="Recurring"
          aria-label="Recurring">↻</span>
  </td>

Manual expenses (recurringId == null) render the description as plain
text with no badge. Playwright specs 05–08 assert the presence or
absence of expense-row-recurring-badge per row type.

```bash
sed -n '208,243p' src/routes/expenses/expense-list-renderer.tsx
```

```output
            <th>Category</th>
            <th>Tags</th>
            <th className='text-right'>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr data-testid='expense-row' data-expense-id={row.id}>
              <td data-testid='expense-row-date'>{row.date}</td>
              <td data-testid='expense-row-description'>
                {row.recurringId ? (
                  <span>
                    <span className='underline'>{row.description}</span>
                    <span
                      className='ml-1 badge badge-sm badge-outline'
                      aria-label='Recurring'
                      title='Recurring'
                      data-testid='expense-row-recurring-badge'
                    >
                      ↻
                    </span>
                  </span>
                ) : (
                  row.description
                )}
              </td>
              <td data-testid='expense-row-category'>{row.categoryName}</td>
              <td data-testid='expense-row-tags'>{row.tagNames.join(', ')}</td>
              <td className='text-right' data-testid='expense-row-amount'>
                {formatCents(row.amountCents)}
              </td>
              <td>
                <a
                  href={`/expenses/${row.id}/edit`}
                  className='btn btn-sm'
```

## 5. listExpenses recurringId plumbing — src/lib/db/expense-access.ts

ExpenseRow gains a recurringId field so the renderer can access it.
The SQL select in listExpensesActual was extended to include
expense.recurringId alongside the existing fields. Drizzle's type
inference propagates the nullable string automatically.

This is the minimal change that threads the DB column value all the
way to the JSX template without any intermediate transformation.

```bash
sed -n '34,43p' src/lib/db/expense-access.ts && echo '---' && sed -n '184,195p' src/lib/db/expense-access.ts
```

```output
  description: string
  categoryName: string
  amountCents: number
  tagNames: string[]
  recurringId: string | null
}

/**
 * Filter options for listing expenses
 */
---
      .select({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        amountCents: expense.amountCents,
        categoryName: category.name,
        recurringId: expense.recurringId,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(whereClause)
      .orderBy(desc(expense.date), asc(sql`lower(${expense.description})`))
```

## 6. Unit Tests

### tests/recurrence.spec.ts

Covers nextOccurrenceAfter for Monthly (existing), plus the new
Quarterly and Yearly cases including:
- 28th-shift: anchor 31, target February -> Feb 28 / Feb 29
- 28th-shift: Quarterly, anchor Mar 31 -> Jun 30 (short month)
- Strictly-after: anchor day == after day still advances one period
- Throws for unknown recurrence string

Covers occurrencesToGenerate:
- Input validation (invalid dates, unknown recurrence, today < createdAt)
- First-occurrence rule (createdAt == anchorDate -> first result is next period)
- lastOccurrence lower bound
- Catch-up: multiple periods in one call
- All three recurrence types

### tests/expense-access.spec.ts

materializeRecurring block:
- Tag-copy: generated expense inherits template tags
- Idempotency: second run same today -> generated=0
- Catch-up: 4 periods generated in one call
- First-occurrence rule: 0 generated when today <= anchor
- Error isolation: bad template does not block good ones
- listExpenses: recurringId is non-null for generated rows, null for manual rows

```bash
cd tests && bun test --reporter=dot 2>&1 | tail -4
```

```output

323 pass
0 fail
Ran 323 tests across 10 files. [10.54s]
```
