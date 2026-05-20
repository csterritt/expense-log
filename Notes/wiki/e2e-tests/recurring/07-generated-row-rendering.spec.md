# e2e-tests/recurring/07-generated-row-rendering.spec.ts

Issue 14. Verifies the ↻ badge and underline rendering for generated rows and that editing a generated expense preserves its `recurringId` provenance.

## Scenario

Seeds one manual expense and one Monthly recurring template. Runs cron to generate one occurrence. On `/expenses`: asserts the generated row shows `expense-row-recurring-badge` and `span.underline`; manual row does not show the badge. Edits the generated row (amount change) and confirms the badge is still present afterwards. Re-runs cron on the same clock; asserts `generated=0` (unique index blocked the re-insert) and row count is unchanged at 2.

## Cross-references

- [src/routes/expenses/expense-list-renderer.tsx.md](../../src/routes/expenses/expense-list-renderer.tsx.md)
- [src/lib/db/expense-access.md](../../src/lib/db/expense-access.md)
