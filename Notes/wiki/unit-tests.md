# Unit Tests Catalog

Catalog of all unit tests under `tests/` (9 spec files total; Issue 11 adds new test cases to two existing files). Each file links to its individual wiki page.

## Test files

- [tests/db-access-retry.spec.ts](./tests/db-access-retry.spec.md) — Tests database access retry logic (`src/lib/db-helpers.ts`). Validates that transient D1 failures are retried up to the configured limit and that permanent failures bubble up correctly.
- [tests/et-date.spec.ts](./tests/et-date.spec.md) — Tests `America/New_York` date helpers (src/lib/et-date.ts). Covers DST boundaries, default-range month wrapping, and `isValidYmd` edges.
- [tests/expense-access.spec.ts](./tests/expense-access.spec.md) — Tests Issue 09/10 category and tag repository helpers with an in-memory SQLite harness. Issue 11 adds a `listExpenses filters` describe block (14 cases) covering: no-filter returns all, from-only, to-only, both, neither dates; description case-insensitive substring; whitespace-only description as no-op; categoryId filter; tagMode or; tagMode and; or vs and differ; combined multi-field filter; ordering; tag-name sort order.
- [tests/expense-validators.spec.ts](./tests/expense-validators.spec.md) — Tests `parseExpenseCreate`, `parseNewCategoryName`, `parseTagCsv`, Issue 09/10 category/tag-management validators, and Issue 11 `parseExpenseListFilters` (src/lib/expense-validators.ts). Issue 11 adds 19 cases covering `hasFilterParams` detection, description trim/whitespace-no-op, valid/invalid from/to dates, open-from/open-to/both/neither, tagId deduplication, single tagId string, tagMode defaults/or/and/invalid, categoryId present/absent/empty.
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
