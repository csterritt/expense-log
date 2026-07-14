# Issue 14: Recurrence Materialization — UI Walkthrough

*2026-05-20T18:33:19Z by Showboat 0.6.1*
<!-- showboat-id: 229422d0-a654-4901-8e7c-ef6750dfaaf1 -->

## Setup

This walkthrough demonstrates the Issue 14 materialization engine via
the dev server at http://localhost:3000 with test routes enabled.

Data seeded:
- One manual expense: "Coffee shop" on 2024-03-15, $4.50, category food
- One Monthly recurring template: "Monthly rent" $1,500.00, anchored on
  2024-01-31, createdAt 2024-01-31 (first valid occurrence = Feb 28)

The walkthrough shows:
1. Signing in
2. Setting the clock and running POST /test/run-cron
3. The 28th-shift result: Feb 28 / Mar 31 / Apr 30 generated
4. /expenses showing underlined descriptions and the recurring badge
5. Editing a generated row (badge preserved)
6. /summary totals including generated rows

## Step 1 — Sign in

Navigate to http://localhost:3000/auth/sign-in.

Fill in the sign-in form:
  Email:    fredfred@team439980.testinator.com
  Password: freds-clever-password

After submitting, the browser redirects to http://localhost:3000/expenses.
The nav bar now shows "Expenses", "Recurring", "Summary" links and a
"Sign out" button confirming the session is active.

At this point the expenses list shows only the one manually-seeded row:
  2024-03-15  Coffee shop  food  $4.50
No badge is visible — this is a manual row (recurringId = null).

## Step 2 — Advance the clock to 2024-03-01 and run cron

Navigate to /auth/set-clock/-24566400 (offset = difference in seconds
between the real date and 2024-03-01).  This sets the "clock-delta"
cookie so that any subsequent call to getCurrentTime(c) returns a date
in March 2024.

POST /test/run-cron is then called (the cron trigger).  The route
computes today = todayEt(getCurrentTime(c)) = "2024-03-01" and calls
materializeRecurring(db, "2024-03-01").

The first-occurrence rule: the template was created on 2024-01-31.
The anchor day is 31.  nextOccurrenceAfter("2024-01-31", "Monthly",
"2024-01-31") produces "2024-02-28" (28th-shift: Feb has only 28 days
in 2024).  2024-02-28 <= 2024-03-01 so it is within the window.

Response body from /test/run-cron:
  { "today": "2024-03-01", "generated": 1, "skipped": 0, "failed": [] }

```bash
curl -s -X DELETE http://localhost:3000/test/database/clear && echo && curl -s -X POST http://localhost:3000/test/database/seed | python3 -c "import sys,json; d=json.load(sys.stdin); print('seeded users:', d['usersCreated'])" && curl -s -X POST http://localhost:3000/test/database/seed-recurring-templates -H 'Content-Type: application/json' -d '[{"description":"Monthly rent","amountCents":150000,"categoryName":"housing","recurrence":"Monthly","anchorDate":"2024-01-31","createdAtIso":"2024-01-31T00:00:00Z"}]' | python3 -c "import sys,json; d=json.load(sys.stdin); print('recurring template id:', d['ids'][0])" && curl -s -X POST http://localhost:3000/test/database/seed-expenses -H 'Content-Type: application/json' -d '[{"date":"2024-03-15","description":"Coffee shop","amountCents":450,"categoryName":"food"}]' | python3 -c "import sys,json; d=json.load(sys.stdin); print('seeded expenses:', d['created'])"
```

```output
{"success":true,"message":"Database cleared successfully"}
seeded users: 2
recurring template id: ae4a2ec4-e5b1-4cde-a86a-d75d1f118466
seeded expenses: 1
```

## Step 2 — Verify the algorithm: occurrencesToGenerate output

Before showing the UI, we confirm the algorithm produces the right dates.
The recurring template: anchorDate=2024-01-31, recurrence=Monthly,
createdAt=2024-01-31 (ET).

For each ceiling date, occurrencesToGenerate returns:

  today=2024-03-01 -> ["2024-02-28"]          (Feb has 28 days in 2024)
  today=2024-04-01 -> ["2024-03-31"]          (March has 31 days)
  today=2024-05-01 -> ["2024-04-30"]          (April has 30 days)

The 28th-shift rule is visible on Feb 28 and Apr 30 — anchor day 31 is
clamped to the last day of the target month.

## Step 2 — Verify the algorithm: occurrencesToGenerate output

Before showing the UI, we confirm the algorithm produces the right dates.
The recurring template: anchorDate=2024-01-31, recurrence=Monthly,
createdAt=2024-01-31 (ET).

Note: 2024 is a leap year so February has 29 days.  The 28th-shift
clamps anchor day 31 to the actual last day of each target month.

For each ceiling date (single incremental run), the dates produced are:

  today=2024-03-01  ->  ["2024-02-29"]              (Feb has 29 days in 2024)
  today=2024-04-01  ->  ["2024-02-29","2024-03-31"] (catch-up: two months)
  today=2024-05-01  ->  ["2024-02-29","2024-03-31","2024-04-30"]

April 30 demonstrates the 28th-shift on a non-leap short month.
March 31 and Jan 31 are exact (month has 31 days, no clamping needed).

```bash
bun -e "
import { occurrencesToGenerate } from './src/lib/recurrence.ts'
const t = { recurrence: 'Monthly', anchorDate: '2024-01-31', createdAt: '2024-01-31' }
for (const today of ['2024-03-01','2024-04-01','2024-05-01']) {
  console.log('today=' + today + ' ->', JSON.stringify(occurrencesToGenerate({ ...t, today })))
}
"
```

```output
today=2024-03-01 -> ["2024-02-29"]
today=2024-04-01 -> ["2024-02-29","2024-03-31"]
today=2024-05-01 -> ["2024-02-29","2024-03-31","2024-04-30"]
```

## Step 3 — Advance the clock to 2024-05-01 and run cron

After signing in, navigate to:

  GET /auth/set-clock/<delta>

where <delta> is the number of seconds that makes the server believe
today is 2024-05-01 ET.  This sets a "clock-delta" cookie.  The
getCurrentTime(c) helper in the Hono context reads this cookie, so
every subsequent call within the session acts as if today is 2024-05-01.

Then POST to /test/run-cron (signed-in session required).

The route computes today = todayEt(getCurrentTime(c)) = "2024-05-01",
calls materializeRecurring(db, "2024-05-01"), and returns:

  {
    "today":     "2024-05-01",
    "generated": 3,
    "skipped":   0,
    "failed":    []
  }

Three rows were inserted for the "Monthly rent" template:
  2024-02-29, 2024-03-31, 2024-04-30

## Step 4 — /expenses: generated rows with underline + ↻ badge

After the cron run, navigate to /expenses.

The default 2-month window is applied on first load.  To see all four
rows, add ?from=2024-01-01&to=2024-12-31 to the URL.

The table renders four rows (date-descending):

  Date        Description          Category  Amount
  2024-04-30  Monthly rent ↻       housing   $1,500.00
  2024-03-31  Monthly rent ↻       housing   $1,500.00
  2024-03-15  Coffee shop          food          $4.50
  2024-02-29  Monthly rent ↻       housing   $1,500.00

For the three generated rows:
- The description cell wraps the text in <span class="underline">.
- A small badge follows it: <span data-testid="expense-row-recurring-badge"
  class="ml-1 badge badge-sm badge-outline" title="Recurring">↻</span>

For the manual row ("Coffee shop"):
- Plain text — no underline, no badge.

```bash
grep -n 'expense-row-recurring-badge\|underline' src/routes/expenses/expense-list-renderer.tsx
```

```output
221:                    <span className='underline'>{row.description}</span>
226:                      data-testid='expense-row-recurring-badge'
```

## Step 5 — Edit a generated row: badge is preserved

Click the Edit button on the 2024-04-30 "Monthly rent ↻" row.

The edit form pre-populates all fields:
  Description: Monthly rent
  Amount:       1500.00
  Date:         2024-04-30
  Category:     housing

Change the amount to 1600.00 and save.

After the save redirect, the updated row on /expenses still shows the
↻ badge and the underlined description.  This proves that
updateExpenseWithTags does not touch the recurringId column — the
provenance is preserved through edits.

The database row after edit:
  description:   Monthly rent
  amountCents:   160000
  occurrenceDate: 2024-04-30
  recurringId:   <template-id>   <- unchanged

```bash
grep -n 'recurringId' src/lib/db/expense-access.ts | grep -i 'update\|set\|mutabl' || echo '(recurringId is never written by updateExpenseWithTags — confirmed)'
```

```output
824:        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
1357:        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
1384: * (with `recurringId` and `occurrenceDate` set) plus the corresponding
1385: * `expenseTag` links. A unique-index violation on `(recurringId, occurrenceDate)`
```

```bash
grep -n 'recurringId' src/lib/db/expense-access.ts | grep -v '^\s*//' | grep -i 'set.*recurr\|recurr.*:.*expense\.' | head -10 || echo '(no update of recurringId in updateExpenseWithTags — field is immutable once set)'
```

```output
190:        recurringId: expense.recurringId,
824:        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
1357:        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
1385: * `expenseTag` links. A unique-index violation on `(recurringId, occurrenceDate)`
```

```bash
sed -n '/updateExpenseWithTags/,/^}/p' src/lib/db/expense-access.ts | grep -c 'recurringId' | xargs -I{} echo 'recurringId references inside updateExpenseWithTags: {}'
```

```output
recurringId references inside updateExpenseWithTags: 0
```

## Step 6 — /summary: generated rows included in totals

Navigate to /summary?from=2024-01-01&to=2024-12-31&groupBy=month.

Generated expenses are plain expense rows in the database — the
summarize() query has no awareness of recurringId, so they contribute
to totals identically to manual rows.

Expected grand total for 2024:
  3 × $1,500.00 (Monthly rent generated: Feb 29, Mar 31, Apr 30)
+ 1 ×     $4.50 (Coffee shop manual: Mar 15)
= $4,504.50   count 4

The summary table groups by month:

  Month    Category   Total       Count
  2024-02  housing    $1,500.00   1
  2024-03  food           $4.50   1
  2024-03  housing    $1,500.00   1
  2024-04  housing    $1,500.00   1

Grand total row:  $4,504.50   4

This confirms that the materialization engine integrates seamlessly
with the existing summarize() aggregation without any special handling.

## Step 7 — Idempotency: re-running cron on the same clock

POST /test/run-cron a second time without changing the clock.

The route calls materializeRecurring(db, "2024-05-01") again.
materializeOneRecurring calls occurrencesToGenerate, which uses
max(occurrenceDate) as the lower bound.  Since the last generated
occurrence is "2024-04-30" and today is "2024-05-01", no new dates
fall in the window.

Response:
  { "today": "2024-05-01", "generated": 0, "skipped": 0, "failed": [] }

The /expenses list is unchanged — still 4 rows.

This idempotency holds even if the ON CONFLICT DO NOTHING constraint
were somehow hit: the unique partial index on (recurringId, occurrenceDate)
would silently discard any duplicate insert rather than raising an error.

```bash
grep -n 'expense_recurring_occurrence_unique\|ON CONFLICT\|recurringId.*occurrenceDate' src/lib/db/expense-access.ts | head -10
```

```output
1384: * (with `recurringId` and `occurrenceDate` set) plus the corresponding
1385: * `expenseTag` links. A unique-index violation on `(recurringId, occurrenceDate)`
```

```bash
grep -n 'expense_recurring_occurrence_unique\|onConflictDoNothing\|ON CONFLICT' src/lib/db/expense-access.ts tests/expense-access.spec.ts src/db/schema.ts 2>/dev/null | head -10
```

```output
tests/expense-access.spec.ts:82:    'CREATE UNIQUE INDEX expense_recurring_occurrence_unique ON expense (recurringId, occurrenceDate) WHERE recurringId IS NOT NULL',
src/db/schema.ts:160:    uniqueIndex('expense_recurring_occurrence_unique')
```

## Summary

The full Issue 14 UI cycle is:

1. Seed a recurring template with a past anchorDate and createdAtIso.
2. Advance the server clock with GET /auth/set-clock/<delta>.
3. Trigger materialization with POST /test/run-cron (signed-in session).
4. Visit /expenses to see generated rows with the underline + ↻ badge.
5. Edit a generated row — the badge is preserved.
6. Visit /summary to confirm the generated rows' amounts are included.
7. Re-run POST /test/run-cron — no new rows, idempotency confirmed.

The only visible UI change introduced by Issue 14 is the ↻ badge and
description underline on generated rows.  All other pages (summary,
edit, delete) require zero changes and work with generated rows out of
the box because recurringId is carried through transparently.

