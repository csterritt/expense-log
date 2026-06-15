# Code Review — expense-log (Full Codebase)

## Critical Issues

### C1. `Math.random()` used for security-sensitive token generation
**File:** `src/lib/generate-code.ts:15`
`Math.random()` is not cryptographically secure. An attacker who can observe a few tokens can predict future ones. Combined with the 6-digit code space (~900K values), this is trivially brute-forceable.

**Fix:** Use `crypto.getRandomValues()` and increase entropy (e.g., 8+ alphanumeric characters).

### C6. `createTestDb` duplicated 7+ times across test files
**Files:** `tests/expense-access.spec.ts`, `tests/expense-confirm-handler.spec.ts`, `tests/recurring-confirm-handler.spec.ts`, `tests/recurring-edit-confirm-handler.spec.ts`, `tests/summary-access.spec.ts`
The same ~40-line in-memory SQLite setup is copy-pasted. Schema drift in one copy won't be caught.

**Fix:** Extract to `tests/helpers/test-db.ts`.

### C7. Test framework inconsistency: `node:test` vs `bun:test`
**Files:** `tests/et-date.spec.ts`, `tests/money.spec.ts`, `tests/url-validation.spec.ts` use `node:test`; all others use `bun:test`. Different test runners have different APIs (mock APIs, `beforeEach` behavior).

**Fix:** Standardize all unit tests on `bun:test`.

---

## Major Issues

### M1. `withRetry` retries all `Result.err` business-logic errors
**File:** `src/lib/db-helpers.ts:14-16`
Deterministic errors like "Category not found" or "Name already exists" are retried up to 5 times, wasting D1 request quota and adding latency.

**Fix:** Only retry thrown exceptions (transient DB errors), not `Result.err` values. Or add a `retryable` flag to the Result error type.

### M2. Unsafe `as unknown` casts bypass type safety
**File:** `src/index.ts:82,111`
`(env as unknown as Record<string, string | undefined>)` and `(env as unknown as Bindings)` bypass TypeScript's type checking. Misspelled var names won't be caught.

**Fix:** Access through typed `env` directly.

### M3. Duplicate global `Bindings` interface conflicts with local one
**File:** `src/types.d.ts:12-17` vs `src/local-types.ts:28-50`
Two `Bindings` interfaces are declared. TypeScript merges them, but the intent is unclear. The local `Bindings` has `PROJECT_DB: D1Database` plus all optional fields, while the ambient one only has `PROJECT_DB`. The `Session: Maybe<SignInSession>` field on Bindings is architecturally wrong (env bindings are static strings, not session objects).

**Fix:** Remove the duplicate; consolidate to a single authoritative type.

### M4. LIKE wildcard injection in description search
**File:** `src/lib/db/expense-access.ts:141`
`like lower(${'%' + descTrimmed + '%'})` doesn't escape `%` or `_` in user input. Searching for `"100%"` matches `"1000"`, `"1001"`, etc.

**Fix:** Escape `%` → `%%` and `_` → `/_` before interpolation.

### M6. Production email `fetch` doesn't check `response.ok`
**File:** `src/lib/email-service.ts:107-121`
A 4xx/5xx from the email API silently returns success — the caller believes the email was sent.

**Fix:** Add `if (!response.ok) throw new Error(...)` after `fetch`.

### M8. Session middleware fails open on errors
**File:** `src/routes/auth/better-auth-handler.ts:68-74`
`setupBetterAuthMiddleware` catches all errors from `auth.api.getSession` and sets user/session to null. Any session validation error silently fails open — the request continues without auth context.

**Fix:** At minimum, log the error. Consider re-throwing for critical paths.

### M10. Missing imports in `build-create-recurring.tsx`
**File:** `src/routes/recurring/build-create-recurring.tsx:99,198`
`listTags` and `findCategoryByName` are called but never imported. This will crash at runtime when creating a new recurring template.

**Fix:** Add the missing imports from `tag-access` and `category-access`.

### M11. JSX `for` attribute instead of `htmlFor`
**Files:** `src/routes/expenses/expense-list-renderer.tsx:53,68,81,103`, `src/routes/build-summary.tsx:85,110,132,146`
`<label for='...'>` should be `<label htmlFor='...'>` in JSX. Causes browser warnings and may not bind labels correctly.

**Fix:** Replace `for` with `htmlFor` in all JSX files.

### M13. Error message truncation in password change
**File:** `src/routes/profile/handle-change-password.ts:50-57`
Finds the first comma in the error message and truncates everything after it. If the first error message itself contains a comma, the user gets a truncated message.

**Fix:** Use the structured error object from the validator.

### M14. `verifyElementExists` anti-pattern loses diagnostic context
**File:** `e2e-tests/support/page-verifiers.ts:5-6`
Swallowing errors and returning booleans loses all context about *what* element was missing. Every failure shows "expected true, got false."

**Fix:** Use Playwright's `expect(element).toBeVisible()` directly.

### M15. `sign-up-utils.spec.ts` and `db-access-retry.spec.ts` test local copies
**Files:** `tests/sign-up-utils.spec.ts:21-24`, `tests/db-access-retry.spec.ts:16-32`
These tests define local copies of production logic instead of importing the actual functions. If the production implementation diverges, these tests won't catch it.

**Fix:** Import the real functions from the production module.

### M18. `/status` endpoint fetches full table contents to count rows
**File:** `src/routes/test/database.ts`
Should use `SELECT count(*)` instead of fetching all rows.

**Fix:** Rewrite as a count query.

### M19. `db-access-retry.spec.ts` tests a standalone copy of `withRetry`
**File:** `tests/db-access-retry.spec.ts:16-32`
The `withRetry` is defined locally in the test file — these tests verify the test helper, not the real module.

**Fix:** Import the real `withRetry` from the production module.

### M20. Non-null assertions without proper narrowing
**Files:** `src/routes/expenses/expense-post-handler.ts:108`, `src/routes/expenses/build-edit-expense.tsx:319`
`lookup.value!.id` — relies on reasoning about boolean logic. A future refactor could break the invariant.

**Fix:** Use explicit narrowing with an `else` branch.

### M21. Error redirects go to `PATHS.AUTH.SIGN_IN` instead of relevant pages
**Files:** `src/routes/expenses/expense-get-handler.ts:53-73`, `src/routes/build-summary.tsx:311,314`
On DB errors, the user is redirected to the sign-in page despite already being signed in. Confusing UX.

**Fix:** Redirect to the page the user was on with the error message.

### M22. `mergeTagActual` has 6 sequential queries before the batch
**File:** `src/lib/db/tag-access.ts:235-339`
A lot of DB work for a single merge operation.

**Fix:** Combine queries where possible (e.g., fetch source and target rows in a single query).

### M24. `db` context variable type inconsistency
**File:** `src/types.d.ts:22-29` vs `src/local-types.ts:55`
`ContextVariableMap` declares `db: DrizzleD1Database<typeof schema>`, but `DrizzleClient` is derived from `createDbClient` return type. If these differ, runtime type conflicts occur.

**Fix:** Consolidate to a single type definition.

---

## Minor Issues

### Database & Performance

- `src/lib/db/category-access.ts:110-119`: TOCTOU race in `createCategoryActual` — handled by unique constraint but wastes retries.
- `src/lib/db/category-access.ts:77`, `src/lib/db/tag-access.ts:141`: Redundant `lower()` on already-lowercased parameters.
- `src/lib/db/expense-access.ts:148-179`: Tag filtering materializes subquery results into JS arrays; could use SQL `EXISTS`.
- `src/lib/db/summary-access.ts:219-223`: `SORT_COLUMN_TO_PROP` defined inside function body — recreated on every call.
- `src/lib/db/summary-access.ts:236-243`: Dynamic property access via `as unknown as Record<string, unknown>`.
- `src/lib/time-access.ts:36`: `parseInt(ds)` without radix — use `parseInt(ds, 10)`.

### Forms & UX

- `src/routes/expenses/expense-form.tsx:226,272-274`: Missing `key` prop on `<li>` and hidden `<input>` in `.map()`.
- `src/routes/expenses/expense-list-renderer.tsx:207`: Missing `key` on `<tr>` in expense rows.
- `src/routes/expenses/expense-form.tsx:83`: `maxLength={descriptionMax + 50}` — undocumented fudge factor.
- `src/routes/expenses/build-edit-expense.tsx:150`, `src/routes/recurring/build-create-recurring.tsx`: `noValidate` on ALL forms — no client-side validation feedback.
- `src/routes/build-layout.tsx:151`: Hardcoded copyright year 2025.

### Testing

- `tests/expense-access.spec.ts:101-104`: Seed creates `Date` objects for columns stored as integers.
- `tests/expense-access.spec.ts:186,328`: `>=` timestamp check can't detect "timestamp wasn't updated."
- `tests/expense-confirm-handler.spec.ts:122-156`: Tests read filesystem (`drizzle/meta` snapshot) — coupled to snapshot format.
- `tests/expense-confirm-handler.spec.ts:186-188`: Weak assertion `signature.length > 10` — HMAC-SHA256 is always 64 hex chars.
- `tests/money.spec.ts:37`: No test for negative `formatCents`.
- `tests/tag-chip-checkboxes.spec.ts:97-102`: XSS test accepts double-encoding as pass.
- `e2e-tests/support/test-data.ts:112-125`: All `BASE_URLS` hardcode `http://localhost:3000`.
- `e2e-tests/support/db-helpers.ts`: All endpoints hardcode `http://localhost:3000`.
- `e2e-tests/support/page-verifiers.ts:36,40,44,48`: Several verifiers use `page: any` instead of `Page`.
- `e2e-tests/support/finders.ts:16-24`: `verifyElementExists` swallows errors — assertion failures lost.
- `e2e-tests/support/mode-helpers.ts:17-21`: On HTTP failure, silently defaults to `'OPEN_SIGN_UP'`.
- `e2e-tests/support/test-helpers.ts:11-25`: `clearDatabase()` failure in `finally` swallows original test error.

### Code Quality

- `src/local-types.ts:31`: `db?: string` — unclear what this is for alongside `PROJECT_DB: D1Database`.
- `src/renderer.tsx:18`: CSS file hardcoded as `/style-20250722184943.css` — breaks on rebuild.
- `src/scheduled.ts:34`: Hardcoded log values instead of actual result counts.
- `src/routes/expenses/expense-confirm-post-handler.ts:98`: `newCategoryName !== null` — should be `!= null` (handles undefined).
- `src/routes/expenses/expense-form-helpers.ts:22`: `tags` property in values is vestigial and unused.
- `src/routes/expenses/expense-form-helpers.ts`: `readRawBody` duplicated across 5+ files.
- `src/routes/build-edit-expense.tsx:50-56` vs `build-edit-recurring.tsx:60`: Inconsistent `requireId` return type (`''` vs `null`).
- `src/routes/auth/build-email-confirmation.tsx:119,182`: Hardcoded route paths instead of `PATHS.AUTH.*` constants.
- `src/routes/auth/build-gated-interest-sign-up.tsx:110`: Unsafe type assertion `(c as unknown as { get: ... })` — repeated in 6+ files.
- `src/lib/email-service.ts:51`: `parseInt` without radix.
- `src/lib/form-state.ts:66`: No size guard for flash cookie payload — can exceed ~4KB cookie limit.
- `src/lib/po-notify.ts:18-30`: `gatherResponse` redefined on every `post()` call.
- `src/lib/sign-up-utils.ts:252`: Email not URL-encoded before cookie storage.
- `src/lib/validators.ts:232`: Depends on Valibot's internal error message wording — fragile.
- `src/lib/expense-validators.ts:388-390,558-560,417-419,587-589`: Dead code — unreachable `isErr` checks after early returns.
- `src/routes/profile/handle-change-password.ts:77,85`: `console.log`/`console.error` with PII in production.
- `src/routes/profile/handle-delete-account.ts:34,39,57,70`: Logging user email in production.
- `src/routes/build-summary.tsx:295-298`: Mutating `parsed` object — side effect in data flow.
