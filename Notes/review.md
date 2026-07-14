# Code Review Findings

Scope reviewed: `src`, `tests`, and `e2e-tests`.


## Findings

### 1. High: Gated sign-up consumes invitation codes before account creation succeeds

- **Location**: `src/lib/sign-up-utils.ts:271-285`, `src/lib/sign-up-utils.ts:287-320`
- **Issue**: `processGatedSignUp` calls `claimSingleUseCode` before calling `auth.api.signUpEmail`. If the Better Auth sign-up later fails because the email/name is duplicated, email delivery fails, Better Auth is temporarily unavailable, or any other validation/runtime error occurs, the single-use code remains claimed by `singleUseCode.email` and cannot be reused.
- **Impact**: A legitimate invite can be burned without creating an account. This is especially visible for duplicate-email attempts: the code is consumed, then the handler redirects as though the account already exists.
- **Recommendation**: Make code claim and account creation atomic from the user perspective. Options include deferring code consumption until after successful account creation, adding a compensating release on failed sign-up, or storing a pending claim with expiry and only finalizing it after Better Auth succeeds. Add tests for sign-up failure after successful code claim.

### 2. High: User-owned expense data is not scoped to a user

- **Location**: `src/db/schema.ts:98-180`, `src/lib/db/expense-access.ts:115-230`, `src/lib/db/category-access.ts:36-325`, `src/lib/db/tag-access.ts:81-333`, `src/lib/db/summary-access.ts:34-183`
- **Issue**: The expense, category, tag, recurring, and join tables do not include `userId`, and all list/edit/delete/summary helpers operate globally. Signed-in routes only check that some user is authenticated; they do not restrict data to the current user.
- **Impact**: In a multi-user deployment, every signed-in user can see and mutate the same global expense/category/tag data. This is a serious authorization/data isolation issue for an expense-tracking app.
- **Recommendation**: Add `userId` ownership columns to user-owned tables, include indexes for `(userId, ...)`, and thread the authenticated user id through all DB access methods. Every query, update, merge, and delete should include a `userId` predicate or operate through rows already proven to belong to that user. Add e2e/unit tests with two users to prove isolation.

### 3. Medium: Summary tag filters can silently ignore invalid tag IDs

- **Location**: `src/lib/db/summary-access.ts:90-128`
- **Issue**: When summary filters include `tagIds`, the code resolves those IDs into tag names and filters against names. If the requested IDs do not exist, `tagNameRows` is empty and `tagNameFilter` becomes an empty `Set`. OR mode then filters out every expense, while AND mode treats the empty set as “all required tags are present” and lets every expense through. The behavior is inconsistent and does not match list filtering, which returns no rows when no selected tag IDs match.
- **Impact**: A malformed or stale `tagId` query can produce surprising summary output, especially in `tagMode=and`, where an invalid tag selection effectively removes the tag filter.
- **Recommendation**: Filter by tag IDs directly, or if `filters.tagIds.length > 0` and the lookup returns fewer matching tags than requested, return an empty result. Add tests for nonexistent tag IDs in both OR and AND modes.

### 4. Medium: Summary aggregation double-counts expenses with multiple tags in the grand total

- **Location**: `src/lib/db/summary-access.ts:145-161`, `src/routes/build-summary.tsx:206-207`
- **Issue**: `summarize` emits one row per tag for a multi-tag expense, each row containing the full expense amount. `SummaryTable` then computes the grand total and count by summing rows. A single `$10` expense with two tags contributes `$20` and count `2` to the displayed grand total.
- **Impact**: The grand total/count can be misleading whenever expenses have multiple tags. This may be intentional for tag allocation reporting, but the UI labels it simply as “Grand total,” which users generally expect to represent total expense dollars once.
- **Recommendation**: Decide whether tag rows are allocation rows or expense totals. If the grand total should represent actual spending, compute it from distinct expenses or return separate metadata from `summarize`. If duplication is intentional, label it clearly and add tests documenting the semantics.

### 5. Medium: Expense list filter accepts reversed date ranges without validation

- **Location**: `src/lib/expense-validators.ts:676-696`, `src/routes/expenses/expense-get-handler.ts:45-51`
- **Issue**: `parseExpenseListFilters` validates `from` and `to` independently but does not reject `from > to`. `parseSummaryQuery` handles this correctly at `src/lib/expense-validators.ts:837-840`, so behavior is inconsistent between pages.
- **Impact**: Users can submit an impossible date range and see an empty list without any field error, making it look like there are no expenses instead of invalid input.
- **Recommendation**: Add a `from <= to` check to `parseExpenseListFilters`, mirroring `parseSummaryQuery`, and add unit/e2e coverage.

### 6. Medium: Email service does not validate production HTTP send failures

- **Location**: `src/lib/email-service.ts:100-120`, `src/lib/email-service.ts:179-183`, `src/lib/email-service.ts:249-253`
- **Issue**: In non-test mode, `createTransporter().sendMail` returns the `fetch` response from `EMAIL_SEND_URL` but never checks `response.ok`. A 400/401/500 response resolves successfully, causing confirmation/reset flows to log success even when the email provider rejected the request.
- **Impact**: Users may not receive verification or reset emails, while the application proceeds as though delivery succeeded. This can lock users out or make sign-up/reset flows difficult to diagnose.
- **Recommendation**: Check `response.ok`; on failure, include status and a sanitized response body in the thrown/logged error. Add unit tests that mock non-2xx responses.

### 7. Medium: Flash/form cookies can exceed browser limits and are not size-guarded

- **Location**: `src/lib/form-state.ts:55-63`, `src/lib/redirects.tsx:18-43`, `src/lib/cookie-support.ts:35-47`
- **Issue**: Validation errors and sticky form values are serialized into cookies without a size check. Expense fields allow long descriptions/tags, and messages can contain user-provided names. Once encoded, the cookie can exceed common per-cookie limits, causing truncation or dropped cookies.
- **Impact**: Users can lose validation feedback/sticky input after redirects. In worst cases, oversized `Set-Cookie` headers can cause inconsistent behavior across browsers and proxies.
- **Recommendation**: Keep flash payloads small, truncate stored values, or store only an opaque ID server-side. At minimum, enforce a maximum encoded cookie size and fall back to a generic error if exceeded.

### 8. Low: `withRetry` retries deterministic validation and constraint errors

- **Location**: `src/lib/db-helpers.ts:9-24`, call sites such as `src/lib/db/category-access.ts:95-130` and `src/lib/db/tag-access.ts:96-123`
- **Issue**: `withRetry` retries every `Result.err`, including deterministic errors such as duplicate category/tag names, missing categories, invalid IDs, and validation-like repository errors.
- **Impact**: User mistakes and uniqueness conflicts incur up to five retries, increasing latency and load while also logging final errors for expected conditions.
- **Recommendation**: Retry only transient errors such as D1 busy/locked/network failures. Return known domain errors without retrying, or introduce typed errors with a `retryable` flag.

### 9. Low: Test suite has weak/placeholder coverage for core expense write helpers

- **Location**: `tests/expense-access.spec.ts:126-130`, `src/lib/db/expense-access.ts:244-757`
- **Issue**: The unit test file contains an intentionally empty test for expense DB helpers, while important write helpers such as `createExpenseWithTags`, `createManyAndExpense`, `updateExpenseWithTags`, `updateManyAndExpense`, and `deleteExpense` are mostly deferred to Playwright. The existing in-memory SQLite harness could test these directly.
- **Impact**: Edge cases like atomicity assumptions, invalid existing category/tag IDs, duplicate tag/category races, and partial failure behavior are harder to catch quickly. E2E tests are slower and often less precise for repository-level failure modes.
- **Recommendation**: Add focused unit tests for the expense write helpers, especially failure paths and transactional/rollback behavior. Avoid placeholder tests that pass without asserting behavior.

### 10. Low: Tests mirror an atomic `db.batch` behavior that may not catch production-specific rollback assumptions

- **Location**: `tests/expense-access.spec.ts:82-87`, `src/lib/db/expense-access.ts:264-280`, `src/lib/db/expense-access.ts:345-350`, `src/lib/db/expense-access.ts:472-488`, `src/lib/db/expense-access.ts:605-745`
- **Issue**: The test harness implements `db.batch` with a Bun SQLite transaction. That is useful, but it also bakes in rollback semantics for all batched statements. The production D1/Drizzle behavior should be explicitly verified for the same failure modes the code relies on.
- **Impact**: If production batch behavior differs for any statement class or driver edge case, tests may pass while production can leave partial writes.
- **Recommendation**: Add integration/e2e tests that intentionally force a mid-batch failure and assert no partial category/tag/expense/link rows remain. Keep the unit transaction harness, but do not rely on it as the only proof of production atomicity.
