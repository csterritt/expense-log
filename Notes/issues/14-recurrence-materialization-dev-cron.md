## Issue 14: Recurrence algorithm, materialization, and dev cron route

**Type**: AFK
**Blocked by**: Issue 13

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

The full recurring engine, exercisable via a dev-only manual-trigger route:

- `src/lib/recurrence.ts` — pure module exporting `occurrencesToGenerate({ recurrence, anchorDate, createdAt, lastOccurrence?, today })` and `nextOccurrenceAfter({ recurrence, anchorDate, after })`. Encapsulates the 28th-shift rule (days 29/30/31 shift to 28) for Monthly, Quarterly, and Yearly, and the first-occurrence rule (first candidate strictly after the template's creation date ET).
- `expense-repo.materializeRecurring(today)` — iterates every template, calls `occurrencesToGenerate`, inserts `expense` rows with `recurringId` + `occurrenceDate` (copying `description`, `amountCents`, `categoryId`, and tag set from the template at generation time). The unique index on `(recurringId, occurrenceDate)` guarantees idempotency; unique-constraint errors are caught and treated as no-ops. Per-template errors are aggregated and returned, never thrown out of the loop.
- `POST /test/run-cron` — dev-only route guarded by `isTestRouteEnabledFlag`, marked `// PRODUCTION:REMOVE`, that calls `materializeRecurring(todayEt())` and returns the generated/failed counts as JSON. Intended to be combined with the existing `/test/set-clock` hook for deterministic e2e tests.
- List rendering: rows whose `recurringId` is non-null render with description underlined and a small `↻` badge next to the description. They participate in search, filter, and summary identically to manual rows.

See PRD section _Recurring expenses and the cron_ (all sub-sections except _Cron trigger_ and _Failure reporting_ production wiring), user stories 60, 61, 62, 63, 66, 67, 68, 69, 70.

### How to verify

- **Manual**:
  1. Create a Monthly template with anchor day 31 anchored on Jan 31 of this year; use `/test/set-clock` to advance the clock across several months; call `POST /test/run-cron` and confirm generated rows appear on Feb 28, Mar 31, Apr 30, etc.
  2. Call `POST /test/run-cron` twice in succession on the same clock; confirm no duplicates.
  3. Advance the clock past the template's anchor day; confirm `materializeRecurring` does not back-fill the current period for a freshly-created template (first-occurrence rule).
  4. On `/expenses`, confirm generated rows render underlined with the ↻ badge.
  5. Edit a generated row's amount; confirm the `recurringId` remains on that row (provenance preserved) and future cron runs do not re-insert that occurrence.
- **Automated**:
  - Unit tests for `recurrence` covering: Monthly/Quarterly/Yearly with anchor days 1, 15, 28, 29, 30, 31; Feb 29 yearly anchor in leap and non-leap years; May 31 yearly anchor; catch-up across multiple missed periods; first-occurrence rule for freshly created templates.
  - Unit / integration tests of `materializeRecurring` asserting idempotency (running twice produces identical results) and correct catch-up within `(lastOccurrence, today]` bounded below by creation.
  - Playwright e2e using `/test/set-clock` + `POST /test/run-cron` to exercise the 28th-shift rule, catch-up after clock jumps, idempotency, and the ↻-badge rendering.

### Acceptance criteria

- [ ] Given a Monthly template anchored on day 31, when cron runs across a February, then the generated row's date is Feb 28.
- [ ] Given a Yearly template anchored Feb 29 of a leap year, when cron runs across a non-leap year, then the generated row's date is Feb 28.
- [ ] Given two successive cron runs on the same clock, when both complete, then no duplicate rows exist (idempotency).
- [ ] Given a template created today with anchor day 5 and today's day-of-month is 10, when cron runs later today, then no row is generated for the current month.
- [ ] Given the cron has not run for several periods, when it next runs, then one row per missed period is generated, none earlier than the template's creation date.
- [ ] Given a generated row is edited, when the row is saved, then its `recurringId` and `occurrenceDate` are preserved.
- [ ] Given a row's `recurringId` is non-null, when `/expenses` renders, then the row shows its description underlined with a ↻ badge.
- [ ] Given generated rows exist, when any search, filter, or summary query runs, then generated and manual rows are counted identically.

### User stories addressed

- User story 60: first-occurrence rule (no retroactive insert)
- User story 61: Monthly with 28th-shift
- User story 62: Quarterly with 28th-shift
- User story 63: Yearly with 28th-shift
- User story 66: list rendering with underline + ↻ badge
- User story 67: edit/delete generated rows preserve provenance
- User story 68: generated rows counted in search/filter/summary
- User story 69: cron never double-inserts
- User story 70: catch-up across missed days, never earlier than creation

---
