# Unit Tests Catalog

Catalog of all unit test files under `tests/`. Tests run with Bun's built-in test runner (`bun test`).

## Test files

| File | Summary |
|------|---------|
| [auth-validators.spec.ts](tests/auth-validators.md) | Tests for Valibot auth form schemas (sign-in, sign-up, password reset validation). |
| [db-access-retry.spec.ts](tests/db-access-retry.md) | Tests for DB access retry logic on transient failures. |
| [et-date.spec.ts](tests/et-date.md) | Tests for America/New_York date utilities (todayEt, defaultRangeEt, month/quarter labels, chronological keys). |
| [expense-access.spec.ts](tests/expense-access.md) | Tests for expense DB access (CRUD, list with filters, tag linking). |
| [expense-confirm-handler.spec.ts](tests/expense-confirm-handler.md) | Tests for expense confirm-create-new POST handler logic. |
| [expense-validators.spec.ts](tests/expense-validators.md) | Tests for expense form validators (parseExpenseCreate, parseTagInputs, parseSummaryQuery, filter parsing). |
| [money.spec.ts](tests/money.md) | Tests for money utilities (formatCents, formatCentsPlain, parseAmount with various input formats). |
| [po-notify.spec.ts](tests/po-notify.md) | Tests for Pushover notification integration. |
| [recurrence.spec.ts](tests/recurrence.md) | Tests for recurrence date arithmetic (nextOccurrenceAfter, occurrencesToGenerate, day-of-month clamping). |
| [recurring-confirm-handler.spec.ts](tests/recurring-confirm-handler.md) | Tests for recurring confirm-create-new POST handler logic. |
| [recurring-edit-confirm-handler.spec.ts](tests/recurring-edit-confirm-handler.md) | Tests for recurring confirm-edit-new POST handler logic. |
| [scheduled.spec.ts](tests/scheduled.md) | Tests for scheduled cron job (recurring expense materialization). |
| [send-email.spec.ts](tests/send-email.md) | Tests for email sending (SMTP config validation, OTP email, retry logic). |
| [sign-up-utils.spec.ts](tests/sign-up-utils.md) | Tests for sign-up utilities (duplicate detection, error handling, processGatedSignUp). |
| [summary-access.spec.ts](tests/summary-access.md) | Tests for summary DB access (group-by aggregation, chronological sort, granularity). |
| [tag-chip-checkboxes.spec.ts](tests/tag-chip-checkboxes.md) | Tests for tag chip checkbox component rendering and behavior. |
| [time-access.spec.ts](tests/time-access.md) | Tests for time access module (getCurrentTime, delta manipulation in test mode). |
| [url-validation.spec.ts](tests/url-validation.md) | Tests for URL validation (open redirect prevention, same-origin check, relative path handling). |

## helpers/

| File | Summary |
|------|---------|
| [test-db.ts](tests/helpers/test-db.md) | Test database helper — creates isolated D1 database instance for unit tests. |
