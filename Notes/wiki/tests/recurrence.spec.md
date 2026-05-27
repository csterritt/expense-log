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

**Yearly — basic (2 cases):**
- Same year when not yet passed.
- Advances to next year when passed.

**Yearly — 28th-shift (2 cases):**
- Feb 29 anchor in non-leap year → Feb 28.
- Anchor 28 stays at 28.

**Monthly — basic (7 cases):**
- Returns same month when not yet passed.
- Advances to next month when passed.
- Anchor day 31 clamps to month-end (Feb 28/29, Apr 30).
- Anchor 28/29/30 stay fixed.

**Monthly — strictly-after (3 cases):**
- After equal to anchor advances to next month.
- Anchor == after returns next month.
- Various edge cases around month boundaries.

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
