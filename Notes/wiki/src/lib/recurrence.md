# src/lib/recurrence.ts

Recurrence date computation utilities. Pure calendar arithmetic on YYYY-MM-DD strings — no date library, no Drizzle, no Hono imports.

## Functions

### nextOccurrenceAfter({ recurrence, anchorDate, after }): string

Returns the next occurrence date strictly after `after` for the given recurrence rule and anchor date.

- **Monthly**: next date with same day-of-month as anchor. Day clamped to target month's last day (28th-shift rule: anchor 29/30/31 in Feb → Feb 28).
- **Quarterly**: next date 3 months from anchor month cycle. Same day clamping.
- **Yearly**: next date with same month/day as anchor in a later year. Feb 29 → Feb 28 in non-leap years.

Throws on invalid YYYY-MM-DD inputs.

### occurrencesToGenerate({ recurrence, anchorDate, createdAt, lastOccurrence?, today }): string[]

Computes all occurrence dates to generate between `lastOccurrence` (exclusive) and `today` (inclusive).

- **First-occurrence rule**: occurrences on or before `createdAt` are never generated.
- **lastOccurrence exclusive**: when present, is the exclusive lower bound. When absent, `createdAt` is used.
- Returns ascending list of YYYY-MM-DD dates.

## Internal helpers

- `daysInMonthFor(year, month)` — days in month using UTC trick
- `parseYmd(s)` — splits YYYY-MM-DD into `[year, month, day]` tuple
- `formatYmd(year, month, day)` — pads and joins into YYYY-MM-DD

## Dependencies

- `./et-date` — `isValidYmd`
