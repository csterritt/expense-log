# e2e-tests/recurring/06-cron-idempotency.spec.ts

Issue 14. Exercises first-occurrence rule, catch-up generation, and idempotency in three sub-tests.

## Tests

1. **First-occurrence rule** — template `createdAt` equals anchor date, clock advanced 5 days → `generated=0`, `/expenses` shows empty state.
2. **Catch-up** — template created Jan 1, anchor Jan 15; clock advanced to Apr 20 → `generated=4` (Jan 15, Feb 15, Mar 15, Apr 15); four rows visible.
3. **Idempotency** — first run generates 3 rows; second run on same clock → `generated=0`, row count unchanged at 3.

## Cross-references

- [src/lib/recurrence.md](../../src/lib/recurrence.md)
- [src/routes/test/run-cron.md](../../src/routes/test/run-cron.md)
