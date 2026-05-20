# Unit Tests Catalog

Catalog of all unit tests under `tests/` (10 spec files total; Issue 13 adds new test cases to two existing files and a new `recurrence.spec.ts`; Issue 14 expands `recurrence.spec.ts` and `expense-access.spec.ts`). Each file links to its individual wiki page.

## Test files

- [tests/db-access-retry.spec.ts](./tests/db-access-retry.spec.md) — Tests database access retry logic (`src/lib/db-helpers.ts`). Validates that transient D1 failures are retried up to the configured limit and that permanent failures bubble up correctly.
- [tests/et-date.spec.ts](./tests/et-date.spec.md) — Tests `America/New_York` date helpers (src/lib/et-date.ts). Covers DST boundaries, default-range month wrapping, and `isValidYmd` edges.
- [tests/expense-access.spec.ts](./tests/expense-access.spec.md) — Tests Issue 09/10 category and tag repository helpers with an in-memory SQLite harness. Issue 11 adds `listExpenses filters` coverage (14 cases). Issue 13 adds coverage for `listRecurring`, `getRecurringById`, `createRecurringWithTags`, `createManyAndRecurring`, `updateRecurringWithTags`, `updateManyAndRecurring`, and `deleteRecurring` helpers. Issue 14: adds unique partial index `expense_recurring_occurrence_unique` on `(recurringId, occurrenceDate)` to the test schema; adds `materializeRecurring` block covering tag-copying, idempotency, catch-up, first-occurrence rule, error isolation per template, and `listExpenses` `recurringId` surfacing.
- [tests/expense-validators.spec.ts](./tests/expense-validators.spec.md) — Tests `parseExpenseCreate`, `parseNewCategoryName`, `parseTagCsv`, Issue 09/10 category/tag-management validators, Issue 11 `parseExpenseListFilters`, and Issue 13 `parseRecurringCreate`. Issue 13 adds 25 cases covering happy paths for each recurrence value, description/amount/category/recurrence/anchorDate rejection paths, and a multi-error simultaneous-failure test.
- [tests/recurrence.spec.ts](./tests/recurrence.spec.md) — Issue 13. Tests `nextOccurrenceAfter` (src/lib/recurrence.ts): monthly anchors 1/15/28/29/30/31, clamping on short months (Feb, April), strictly-after semantics when anchor day equals `after` day. Issue 14: Quarterly (3-month advance, 28th-shift, strictly-after) and Yearly (1-year advance, 28th-shift, Feb 29 anchor); throws for unknown recurrence; comprehensive `occurrencesToGenerate` coverage: input validation, first-occurrence rule, `lastOccurrence` lower bound, catch-up for Monthly/Quarterly/Yearly.
- [tests/money.spec.ts](./tests/money.spec.md) — Tests `formatCents` and `parseAmount` (src/lib/money.ts) for representative cent values and the parser's accept/reject grammar.
- [tests/send-email.spec.ts](./tests/send-email.spec.md) — Tests email sending utilities (src/lib/send-email.ts). Covers transport selection, template rendering, error handling, and optional SMTP configuration parsing.
- [tests/sign-up-utils.spec.ts](./tests/sign-up-utils.spec.md) — Tests sign-up validation and processing utilities (src/lib/sign-up-utils.ts). Validates email normalization, password strength checks, name trimming, and duplicate detection logic.
- [tests/time-access.spec.ts](./tests/time-access.spec.md) — Tests time-access utilities (src/lib/time-access.ts). Covers clock manipulation for testing, duration formatting, and boundary conditions.
- [tests/url-validation.spec.ts](./tests/url-validation.spec.md) — Tests URL validation helpers (src/lib/url-validation.ts). Validates allowed origin patterns, redirect URL safeness, and hostname matching logic.

## Notes

- Unit tests run with `bun test` (or the project's configured unit test runner).
- These focus on pure logic and utility functions that do not require Hono request context, Better Auth sessions, or a live database.
- Any change to the corresponding `src/lib/` utilities should include updates to these tests.

## Cross-references

- See [source-code.md](source-code.md) for the `lib/` source files being tested.
- See [e2e-tests.md](e2e-tests.md) for broader integration and UI tests.
