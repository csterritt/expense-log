High

1. Expense idempotency does not atomically record the mutation
Location: @/home/chris/expense-log/src/lib/submission-idempotency.ts:122-158
Severity: High
Pass: Logic errors / operation ordering
Description: run() commits the expense first, then the submission key is inserted separately. The result of that ledger insertion is ignored. If the expense commits but the ledger write or response fails, the client retries with the same key and creates a duplicate expense. Concurrent requests using the same key can also both pass the initial lookup and execute run().This contradicts the documented guarantee that the mutation and key are committed in the same transaction. The expense handlers rely on that guarantee. @/home/chris/expense-log/src/routes/expenses/expense-post-handler.ts:113-138Existing tests only exercise sequential successful replay; they do not simulate ledger failure, concurrent submissions, or a lost response after commit. @/home/chris/expense-log/tests/submission-idempotency.spec.ts:70-110 The E2E retry test injects a failure before the request reaches the server, so it cannot detect this defect. @/home/chris/expense-log/e2e-tests/expenses/21-resilient-submit-retry-backoff.spec.ts:29-59
Fix: Make claiming/recording the key and the expense mutation one atomic database operation. For D1, restructure the mutation so its statements and the ledger insert are submitted in one db.batch. Alternatively, atomically claim the unique key before mutation and persist a defined pending/completed state. Never return success if recording the ledger failed.

Medium

2. Expense-list database failures create a redirect loop
Location: @/home/chris/expense-log/src/routes/expenses/expense-get-handler.ts:56-67
Severity: Medium
Pass: Logic errors / bad practices
Description: Any failure loading expenses, categories, or tags redirects an authenticated user to /auth/sign-in. The sign-in route detects the existing session and redirects that user directly back to /expenses, producing a loop while the database failure persists. @/home/chris/expense-log/src/routes/auth/build-sign-in.tsx:126-137
Fix: Render an error response on the current route, or redirect to a destination that does not redirect authenticated users back to /expenses. Add an E2E test that injects a persistent list-query failure and asserts that a finite, recoverable error page is shown.

3. Stale tag filters affect the query after being removed from the rendered filter state
Location: @/home/chris/expense-log/src/routes/expenses/expense-get-handler.ts:52-70
Severity: Medium
Pass: Logic errors / operation ordering
Description: listExpenses executes with all syntactically valid tag IDs before nonexistent IDs are removed. The cleaned IDs are used only for rendering. Consequently:
a stale-only tag filter returns no expenses while the UI shows no selected tag;
an and filter containing one existing and one stale ID returns no expenses, but the stale ID disappears from the UI.
The E2E stale-tag test combines a real tag and stale tag in the default or mode and only checks chip values, so it misses both cases. @/home/chris/expense-log/e2e-tests/expenses/23-list-filter-chip-unification.spec.ts:190-224
Fix: Load tags and resolve activeFilters.tagIds before calling listExpenses, then query with resolvedFilters. Add stale-only and tagMode=and E2E cases that assert both the displayed filter state and expense rows.

Summary
No critical security issue was found. In particular, shared expense visibility is intentional per the PRD rather than a missing ownership check. @/home/chris/expense-log/Notes/PRD-expense-log.md:278-282

Overall coverage is extensive, but the top issue is the non-atomic idempotency implementation because it can duplicate expenses in exactly the post-commit response-loss scenario the resilient-submit feature is meant to handle.

Verification performed:

Expense unit tests: 291 passed
Submission-idempotency tests: 4 passed
Expense-focused E2E suite: 163 passed, 4 skipped
Worker build: passed
