# Unit Tests Catalog

Catalog of all unit tests under `tests/` (8 spec files total). Each file links to its individual wiki page.

## Test files

- [tests/db-access-retry.spec.ts](./tests/db-access-retry.spec.md) — Tests database access retry logic (`src/lib/db-helpers.ts`). Validates that transient D1 failures are retried up to the configured limit and that permanent failures bubble up correctly.
- [tests/et-date.spec.ts](./tests/et-date.spec.md) — Tests `America/New_York` date helpers (src/lib/et-date.ts). Covers DST boundaries, default-range month wrapping, and `isValidYmd` edges.
- [tests/expense-validators.spec.ts](./tests/expense-validators.spec.md) — Tests `parseExpenseCreate`, `parseNewCategoryName`, and `parseTagCsv` (src/lib/expense-validators.ts). Covers per-field pass/fail cases for description, amount, date, and category, the Issue 05 new-category-name length/empty/whitespace/case-preservation cases, the Issue 06 tag-CSV split/trim/lower-case/dedup/length cases, plus multi-field failure aggregation.
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
