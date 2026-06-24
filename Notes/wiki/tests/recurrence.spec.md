# recurrence.spec.ts

**Source:** `tests/recurrence.spec.ts`

## Purpose

Unit coverage for `src/lib/recurrence.ts` — `nextOccurrenceAfter` and `occurrencesToGenerate`. Tests monthly, quarterly, and yearly recurrence logic including anchor-day clamping, strictly-after semantics, first-occurrence rule, catch-up generation, and idempotency.

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`.

## Test cases

### `nextOccurrenceAfter`

**Input validation (4 cases):**
- Throws on invalid `anchorDate`, impossible `anchorDate` (Feb 30), invalid `after`, impossible `after`.

**Quarterly — basic (5 cases):**
- Returns next slot when anchor day hasn't passed.
- Advances when anchor day equals after day.
- Advances when after is past anchor day.
- Mid-quarter after date returns first hit.
- Year boundary rollover (Nov → Feb).

**Quarterly — 28th-shift (4 cases):**
- Anchor 31 steps to Apr 30, Jul 31, Oct 31.
- Anchor 29/30 into non-leap Feb → Feb 28.
- Anchor 28 stays at 28.

**Quarterly — strictly-after (2 cases):**
- After equal to quarterly date advances to next period.
- Anchor == after returns next slot.

**Yearly — basic (3 cases):**
- Same year when not yet passed.
- Advances to next year when anchor date equals after.
- Advances to next year when after is past anchor day in same year.

**Yearly — 28th-shift (3 cases):**
- Feb 29 anchor → Feb 29 in a leap year.
- Feb 29 anchor → Feb 28 in a non-leap year.
- Feb 29 anchor with after == Feb 28 in non-leap year advances to next year.

**Yearly — May 31 anchor (1 case, 2 assertions):**
- Returns May 31 every year (both before and on anchor day).

**Yearly — strictly-after (1 case):**
- After equal to yearly date advances to next year.

**Monthly — basic same-month hit (3 cases):**
- Returns same month when not yet passed.
- Advances to next month when anchor day equals after day.
- Advances to next month when anchor day is before after day.

**Monthly — year rollover (2 cases):**
- Rolls over from December to January of next year.
- Rolls over on the last day of December.

**Monthly — 28th-shift rule (6 cases):**
- Anchor 29 in non-leap February → Feb 28.
- Anchor 30 in non-leap February → Feb 28.
- Anchor 31 in non-leap February → Feb 28.
- Anchor 29 in leap-year February → Feb 29.
- Anchor 31 in April → Apr 30.
- Anchor 31 in June → Jun 30.

**Monthly — clamped occurrence still after `after` (2 cases):**
- Returns clamped date in same month when strictly after.
- Advances when clamped day equals after day.

### `occurrencesToGenerate`

**Input validation (4 cases):**
- Throws on invalid `anchorDate`, `createdAt`, `lastOccurrence`, `today`.

**First-occurrence rule (4 cases):**
- Empty when created today and anchor is later this month.
- Empty when created on anchor day and today is same day.
- Never returns date <= createdAt.
- Includes day after createdAt if it matches anchor.

**lastOccurrence exclusive lower bound (4 cases):**
- Empty when lastOccurrence equals today.
- Does not re-generate lastOccurrence date.
- Catch-up across missed periods.
- Today inclusive upper bound.

**Quarterly (2 cases):**
- Returns quarterly occurrences between lastOccurrence and today.
- First-occurrence rule applies.

**Yearly (3 cases):**
- Returns yearly occurrences between lastOccurrence and today.
- First-occurrence rule applies.
- Feb 29 anchor generates Feb 28 in non-leap years.

## Cross-references

- [../src/lib/recurrence.md](../src/lib/recurrence.md) — module under test.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
