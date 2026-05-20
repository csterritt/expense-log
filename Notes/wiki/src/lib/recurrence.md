# src/lib/recurrence.ts

Pure calendar arithmetic utilities for the recurring-expense engine.

## Purpose

Provides two exported functions used by the materialization pipeline:
`nextOccurrenceAfter` and `occurrencesToGenerate`. Both operate on
`YYYY-MM-DD` strings with no date-object mutation; all arithmetic is
done with integer year/month/day decomposition.

## Key functions

### `nextOccurrenceAfter(after, recurrence, anchorDate)`

Returns the next occurrence date string strictly after `after`, using
the **28th-shift rule** for day clamping in short months (if the
anchor day exceeds the number of days in the candidate month, it is
clamped to the last day of that month). Supports three recurrence
frequencies:

- **Monthly** — advances by one calendar month.
- **Quarterly** — advances by three calendar months.
- **Yearly** — advances by one calendar year.

Throws on malformed `after` or `anchorDate` and on unknown recurrence
values.

### `occurrencesToGenerate(params)`

Computes the list of occurrence dates to insert for a recurring
template on a given materialization run. Parameters:

| Param | Meaning |
|---|---|
| `anchorDate` | Template's anchor date (day-of-month source of truth) |
| `recurrence` | `'Monthly'` \| `'Quarterly'` \| `'Yearly'` |
| `createdAt` | Template creation `Date` (converted to ET YYYY-MM-DD) |
| `lastOccurrence?` | Most-recent already-generated occurrence YYYY-MM-DD |
| `today` | Materialization ceiling YYYY-MM-DD |

**First-occurrence rule**: an occurrence is only emitted when it is
*strictly after* the template's `createdAt` ET date.

**Lower bound**: `max(createdAt, lastOccurrence)` — when
`lastOccurrence` is provided it becomes the exclusive lower bound,
effectively making re-runs idempotent once `lastOccurrence = today`.

**Upper bound**: `today` inclusive.

Returns a possibly-empty `string[]` of YYYY-MM-DD occurrence dates in
ascending order.

## Cross-references

- [src/lib/db/expense-access.md](db/expense-access.md) — `materializeOneRecurring` and `materializeRecurring` consumers
- [src/routes/test/run-cron.md](../routes/test/run-cron.md) — dev-only cron trigger
- [tests/recurrence.spec.md](../../tests/recurrence.spec.md) — unit-test coverage
