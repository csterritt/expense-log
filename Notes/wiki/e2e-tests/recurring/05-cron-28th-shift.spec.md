# e2e-tests/recurring/05-cron-28th-shift.spec.ts

Issue 14. Tests the 28th-shift clamping rule across a February boundary for a Monthly recurring template anchored on day 31.

## Scenario

Seeds a Monthly template anchored on `2024-01-31` with `createdAtIso = 2024-01-31` (so the first valid occurrence is Feb 28 via `nextOccurrenceAfter`). Advances the test clock through four dates — mid-Feb, Mar 1, Apr 1, May 1 — calling `POST /test/run-cron` after each advance. Asserts per-advance `generated` counts and then visits `/expenses` to assert that exactly three rows are present with dates `2024-02-28`, `2024-03-31`, `2024-04-30` (date-desc order), each showing `expense-row-recurring-badge` and `span.underline` on the description.

## Cross-references

- [src/lib/recurrence.md](../../src/lib/recurrence.md)
- [src/routes/test/run-cron.md](../../src/routes/test/run-cron.md)
