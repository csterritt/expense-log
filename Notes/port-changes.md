# Port Changes: Bring `expense-log` up to `daisy-tw-worker-d1-drizzle` standards

This document describes the fixes that have been applied to the upstream
`daisy-tw-worker-d1-drizzle` project (the auth-only base this project was
forked from) and what must be done to port them into `expense-log`.

**Source project:** `../daisy-tw-worker-d1-drizzle`
**This project:** `expense-log` (substitutes its own `/expenses` page for the upstream `/protected` page)

> Scope: This is a planning document only. No code in this project has been
> changed. Each section below states the upstream fix, its current status in
> `expense-log`, and the concrete edits required.

---

## 1. How the fixes were identified

The upstream fixes are a numbered set of code-review tasks committed to
`daisy-tw-worker-d1-drizzle` (see its `Notes/tasks/` and git history). The
relevant commits are:

- `87ed3b0` — Task 1: invite codes can be burned
- `005d371` — Task 2: password reset token URL encoding
- `44132a3` — Task 3: password reset rate-limiting timing side-channel
- `c941e32` — Task 4: unit tests duplicate implementation logic
- `a643243` — Task 5: e2e isolation helpers hard-code localhost
- `fe2cbe9` — Task 6: reset/change-password validation inconsistent with sign-up
- `5fc15b9` — Task 7: sensitive user identifiers logged
- `a7b6a5f` — Task 8: test-coverage security edge-case gaps (+ `redirects.tsx` cookie change)
- `512dbbe` — switched unit tests to `bun test`

`expense-log` diverged from upstream well before these fixes, so a direct git
merge is not feasible. The mapping below accounts for the file refactoring that
happened in this project.

---

## 2. Function index & refactoring map

Several upstream functions live in different files in `expense-log`. Key
relocations:

| Function(s) | Upstream location | `expense-log` location |
| --- | --- | --- |
| `withRetry`, `toResult` | `src/lib/db-access.ts` | `src/lib/db-helpers.ts` |
| `getUserWithAccountByEmail`, `getUserIdByEmail`, `updateAccountTimestamp`, `claimSingleUseCode`, `addInterestedEmail`, `checkInterestedEmailExists`, `deleteUserAccount` | `src/lib/db-access.ts` | `src/lib/db/auth-access.ts` |
| `normalizeEmail` | `src/lib/email-utils.ts` | **MISSING** (must be added) |
| `releaseSingleUseCode` | `src/lib/db-access.ts` | **MISSING** (must be added to `src/lib/db/auth-access.ts`) |
| `isDuplicateNameError` | `src/lib/sign-up-utils.ts` | **MISSING** (not used here; optional) |
| `sanitizeError`, `logInfo`, `logError`, `logWarn` | `src/lib/logger.ts` | **MISSING** (must be added) |
| `emailRateLimitCache`, `checkAndUpdateInMemoryRateLimit` | `src/routes/auth/handle-forgot-password.ts` | **MISSING** (must be added) |

Functions that exist in both with the same names (no relocation): everything in
`src/lib/sign-up-utils.ts` (minus `isDuplicateNameError`), `src/lib/validators.ts`,
`src/lib/cookie-support.ts`, `src/lib/redirects.tsx`, `src/lib/url-validation.ts`,
all `src/routes/auth/handle-*.ts`, and the two `src/routes/profile/handle-*.ts`.

> Note: Upstream also has `updateResetEmailTimestamp` and
> `updateVerificationEmailTimestamp` in `db-access.ts` that are not present in
> `expense-log`'s `auth-access.ts`. These are unrelated to the fixes below and
> can be ignored unless a fix depends on them (none do).

---

## 3. Shared prerequisites to add first

These helpers are dependencies of the task fixes and should be added before the
per-task work.

### 3a. `normalizeEmail` (needed by Task 1)

Create `src/lib/email-utils.ts`:

```ts
/* MPL-2.0 header */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase()
```

### 3b. `releaseSingleUseCode` (needed by Task 1)

Add to `src/lib/db/auth-access.ts`, mirroring upstream `db-access.ts:221-249`.
It must reverse `claimSingleUseCode` — i.e. clear the `claimedBy`/claimed
timestamp for the matching `code`+`email` — wrapped in `withRetry`. Confirm the
exact `singleUseCode` columns against `src/db/schema.ts` before writing it.

### 3c. `src/lib/logger.ts` (needed by Task 7)

Copy upstream `src/lib/logger.ts` verbatim. It exports `sanitizeError`,
`logInfo`, `logError`, `logWarn`. `sanitizeError` redacts `password`, `token`,
`secret`, `key`, `email`, `authorization` keys and only includes stack traces
when `NODE_ENV !== 'production'`.

### 3d. `VALIDATION.PASSWORD_MAX_LENGTH` constant (needed by Task 6)

In `src/constants.ts`, add to the `VALIDATION` object (after `PASSWORD_MIN_LENGTH`):

```ts
PASSWORD_MAX_LENGTH: 'Password must be at most 128 characters long.',
```

---

## 4. Per-task port instructions

### Task 1 — Invite codes can be burned (High)

**Upstream:** `src/lib/sign-up-utils.ts` (`processGatedSignUp`), commit `87ed3b0`.

**Status in `expense-log`:** NOT ported. `processGatedSignUp`
(`src/lib/sign-up-utils.ts:263-326`) is an older version that:
- does not normalize the email,
- has no `releaseClaimedCode` mechanism, and
- on the synthetic-duplicate branch always redirects with
  `ACCOUNT_ALREADY_EXISTS` **without releasing the claimed code**.

This means an attacker can burn invite codes by submitting a known existing
email. The upstream fix additionally releases the code on *every* failure path,
not just the duplicate case.

**Edits required in `src/lib/sign-up-utils.ts`:**

1. Add imports: `normalizeEmail` from `./email-utils`, and `releaseSingleUseCode`
   from `./db/auth-access`.
2. In `processGatedSignUp`, normalize the email: `const email = normalizeEmail(data.email)`.
3. After a successful claim, define the release closure and pre-check existence
   (mirrors upstream `sign-up-utils.ts:302-314`):

```ts
const releaseClaimedCode = async (): Promise<void> => {
  const releaseResult = await releaseSingleUseCode(dbClient, trimmedCode, email)
  if (releaseResult.isErr) {
    console.error('Failed to release sign-up code after failed sign-up:', releaseResult.error)
  }
}

const existingUserResult = await getUserIdByEmail(dbClient, email)
const userAlreadyExists = existingUserResult.isOk && existingUserResult.value.length > 0
```

4. Call `await releaseClaimedCode()` on each failure branch: empty
   `signUpResponse`, `errorResponse`, non-200 status, and the `catch` block.
5. Change the synthetic-duplicate branch to release the code only when the user
   already exists (mirrors upstream `sign-up-utils.ts:341-348`):

```ts
if (isSyntheticDuplicateResponse(signUpResponse)) {
  addCookie(c, COOKIES.EMAIL_ENTERED, email)
  if (userAlreadyExists) {
    await releaseClaimedCode()
    return redirectWithMessage(c, PATHS.AUTH.AWAIT_VERIFICATION, MESSAGES.ACCOUNT_ALREADY_EXISTS)
  }
  return redirectToAwaitVerification(c, email)
}
```

**Tests:** Update/confirm the gated-sign-up e2e (`code-consumption-semantics`)
so a duplicate-email sign-up leaves the code **unconsumed**
(`checkCodeExists(testCode)` → `true`). The `/test/database/code-exists/:code`
endpoint already exists (`src/routes/test/database.ts:287`).

---

### Task 2 — Reset token reflected into redirect URLs without encoding (High)

**Upstream:** `src/routes/auth/handle-reset-password.ts` + `src/lib/validators.ts`, commit `005d371`.

**Status in `expense-log`:** NOT ported.
- `src/routes/auth/handle-reset-password.ts:36` builds `?token=${tokenEntered}` unencoded.
- `src/routes/auth/handle-reset-password.ts:78` builds `?token=${token}` unencoded.
- `ResetPasswordFormSchema` token (`src/lib/validators.ts:153-156`) lacks a max-length bound.

**Edits required:**

1. In `handle-reset-password.ts`, wrap both interpolations with
   `encodeURIComponent(...)`:
   - line 36: `` `${PATHS.AUTH.RESET_PASSWORD}?token=${encodeURIComponent(tokenEntered)}` ``
   - line 78: `` `${PATHS.AUTH.RESET_PASSWORD}?token=${encodeURIComponent(token)}` ``
2. In `src/lib/validators.ts`, add to the token pipe:
   `maxLength(512, 'Invalid reset token. Please request a new password reset link.')`.

**Tests:** Add unit/e2e coverage that a token containing reserved chars
(`&`, `#`) is fully encoded into the redirect and does not introduce extra query
params (upstream `e2e-tests/reset-password/08-password-reset-token-url-encoding.spec.ts`).

---

### Task 3 — Password reset rate-limiting timing side-channel (Medium)

**Upstream:** `src/routes/auth/handle-forgot-password.ts` + `src/routes/test/database.ts`, commit `44132a3`.

**Status in `expense-log`:** NOT ported. `handle-forgot-password.ts` only
rate-limits known users (via `checkRateLimit` on `accountUpdatedAt`); unknown
emails redirect immediately, enabling user enumeration via timing.
Also note `expense-log`'s handler does **not** normalize the email before the DB
lookup (`src/routes/auth/handle-forgot-password.ts:179`), whereas upstream uses
`normalizeEmail`.

**Edits required in `src/routes/auth/handle-forgot-password.ts`:**

1. Add an isolate-scoped in-memory cache and a uniform check (upstream
   `handle-forgot-password.ts:47-67`):

```ts
export const emailRateLimitCache = new Map<string, number>()

const checkAndUpdateInMemoryRateLimit = (email: string): RateLimitResult => {
  const now = Date.now()
  const lastEmailTime = emailRateLimitCache.get(email) ?? 0
  const timeSinceLastEmail = now - lastEmailTime
  const waitTimeMs = DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS
  if (timeSinceLastEmail < waitTimeMs) {
    const remainingSeconds = Math.ceil((waitTimeMs - timeSinceLastEmail) / 1000)
    return { allowed: false, remainingSeconds }
  }
  emailRateLimitCache.set(email, now)
  return { allowed: true }
}
```

2. In the POST handler, normalize the email and apply the uniform throttle
   **before** the DB lookup (so known and unknown emails behave identically):

```ts
const email = normalizeEmail(data!.email as string)

const inMemoryRateLimit = checkAndUpdateInMemoryRateLimit(email)
if (!inMemoryRateLimit.allowed) {
  return redirectWithError(
    c,
    PATHS.AUTH.FORGOT_PASSWORD,
    MESSAGE_BUILDERS.passwordResetRateLimit(inMemoryRateLimit.remainingSeconds!),
  )
}
```

3. Add a test-only cache-clear endpoint to `src/routes/test/database.ts`
   (import `emailRateLimitCache`), `DELETE /test/database/clear-rate-limit-cache`,
   which calls `emailRateLimitCache.clear()` (upstream `database.ts:323-333`).

**Tests:** Port `e2e-tests/reset-password/06-password-reset-rate-limiting.spec.ts`
expectations and the e2e helper that calls the new clear endpoint.

---

### Task 4 — Unit tests duplicate implementation logic (Medium)

**Upstream:** `tests/db-access-retry.spec.ts`, `tests/sign-up-utils.spec.ts`, commit `c941e32`.

**Status in `expense-log`:** NOT ported.
- `tests/db-access-retry.spec.ts:11-32` re-declares `STANDARD_RETRY_OPTIONS`
  (with a wrong `retries: 3`; the real value is `5`) and re-implements
  `withRetry` instead of importing them.
- `tests/sign-up-utils.spec.ts:13-32` re-implements `isDuplicateEmailError` and a
  local `getErrorMessageForUser` instead of importing the production function.

**Edits required:**

1. In `tests/db-access-retry.spec.ts`, delete the local copies and import the
   real implementations:
   - `import { withRetry } from '../src/lib/db-helpers'` (note: **not**
     `db-access` — this is the relocated path in `expense-log`).
   - `import { STANDARD_RETRY_OPTIONS } from '../src/constants'`.
   - Update the "exhaust retries" assertion to
     `STANDARD_RETRY_OPTIONS.retries + 1` instead of the hard-coded `4`.
2. In `tests/sign-up-utils.spec.ts`, import `isDuplicateEmailError` from
   `../src/lib/sign-up-utils` and drive the user-facing mapping through the real
   exported function rather than a local copy.

> Style note: upstream converted these specs to `bun:test`'s `expect`. This
> project's tests already run under `bun:test` (`import { describe, it } from 'bun:test'`),
> so only the import-vs-duplicate change is required; matcher style is optional.

---

### Task 5 — E2E isolation helpers hard-code localhost (Medium)

**Upstream:** `e2e-tests/support/db-helpers.ts`, `playwright.config.ts`, `package.json`, commit `a643243`.

**Status in `expense-log`:** NOT ported.
- `e2e-tests/support/db-helpers.ts` calls `fetch('http://localhost:3000/...')`
  directly throughout (e.g. lines 7, 37, 69).
- `playwright.config.ts` only sets `workers: 1` — no `testDir`, `baseURL`, or
  `webServer`.
- `package.json` has no `test:e2e` script. (`expense-log` does have per-mode
  `dev-*` scripts, which upstream lacks; keep those.)

**Edits required:**

1. `playwright.config.ts`: add `testDir: './e2e-tests'` and
   `use: { baseURL: 'http://localhost:3000' }` (keep `workers: 1`). Optionally a
   `webServer` block if CI should boot the dev server.
2. `package.json`: add `"test:e2e": "npx playwright test"`.
3. `e2e-tests/support/`: introduce a `SERVER_BASE_URL` constant (upstream keeps
   it in `support/test-data.ts`) and refactor `db-helpers.ts` to accept an
   optional Playwright `request` fixture, falling back to
   `fetch(\`${SERVER_BASE_URL}/...\`)`. Mirror upstream
   `e2e-tests/support/db-helpers.ts:11-35` for each helper
   (`clearDatabase`, `clearSessions`, `checkCodeExists`, etc.).

> Lower priority than the security fixes; purely test-portability.

---

### Task 6 — Reset/change-password validation inconsistent with sign-up (Medium)

**Upstream:** `src/constants.ts` + `src/lib/validators.ts`, commit `fe2cbe9`.

**Status in `expense-log`:** NOT ported. Sign-up schemas enforce
`maxLength(128, ...)` (with a literal string), but:
- `ResetPasswordFormSchema` password/confirmPassword (`src/lib/validators.ts:157-161`) have no max.
- `ChangePasswordFormSchema` newPassword/confirmPassword (`src/lib/validators.ts:178-182`) have no max.
- `VALIDATION.PASSWORD_MAX_LENGTH` does not exist (`src/constants.ts:124-133`).

**Edits required:**

1. Add `VALIDATION.PASSWORD_MAX_LENGTH` (see §3d).
2. In `src/lib/validators.ts`, add `maxLength(128, VALIDATION.PASSWORD_MAX_LENGTH)`
   to the password and confirmPassword pipes of both `ResetPasswordFormSchema`
   and `ChangePasswordFormSchema`.
3. Optionally replace the literal `'Password must be at most 128 characters long'`
   in `SignUpFormSchema`/`GatedSignUpFormSchema` with `VALIDATION.PASSWORD_MAX_LENGTH`
   for consistency.

**Tests:** Add validator tests for oversized (>128) new passwords on both
schemas (upstream expanded `tests/validators.spec.ts`).

---

### Task 7 — Sensitive user identifiers logged (Medium)

**Upstream:** `src/routes/profile/handle-delete-account.ts`,
`src/routes/profile/handle-change-password.ts`, `src/lib/logger.ts`, commit `5fc15b9`.

**Status in `expense-log`:** NOT ported. Both handlers log raw emails and raw
caught errors via `console.log`/`console.error`:
- `handle-change-password.ts:77` logs `user.email`; `:85`, `:110` log raw errors.
- `handle-delete-account.ts:39`, `:57` log `user.email`; `:44`, `:70` log raw errors.

**Edits required:**

1. Add `src/lib/logger.ts` (see §3c).
2. In `handle-change-password.ts`: import `logError, logInfo, sanitizeError`;
   replace email logging with `logInfo('Password changed successfully', { userId: user.id })`
   and error logging with `logError('...', { userId: user.id, error: sanitizeError(error) })`
   (mirrors upstream).
3. In `handle-delete-account.ts`: same treatment — log `{ userId }` instead of
   `user.email`, and wrap caught errors in `sanitizeError(...)`.

---

### Task 8 — Test-coverage security edge-case gaps + `redirects.tsx` (Low)

**Upstream:** `src/lib/redirects.tsx` + tests, commit `a7b6a5f`.

**Status in `expense-log`:** NOT ported, but **needs review before porting**.
Upstream changed `redirectWithMessage`/`redirectWithError` to build the
`Set-Cookie` header directly on the `c.redirect(...)` response (using
`COOKIES.STANDARD_COOKIE_OPTIONS` and `encodeURIComponent`), replacing the
`addCookie(c, ...)` approach. `expense-log` still uses `addCookie`
(`src/lib/redirects.tsx:9,24,42`).

**Decision needed:** Determine whether `expense-log`'s `addCookie` reliably
attaches cookies to 303 redirect responses. If it does, the upstream
`redirects.tsx` rewrite may be unnecessary churn here. If there is any case
where the message/error cookie is dropped on redirect, port the upstream
implementation (build the cookie string from `COOKIES.STANDARD_COOKIE_OPTIONS`
and append `Set-Cookie` to the redirect response). Verify
`COOKIES.STANDARD_COOKIE_OPTIONS` exists in this project's constants first.

**Tests:** This task is primarily about closing coverage gaps. After Tasks 1–7
land, add the focused tests they reference: malformed reset-token encoding,
oversized reset/change passwords, duplicate-email gated sign-up not consuming
codes, cookie value bounds, and unknown-email reset throttling.

---

## 5. Already present / not applicable

- **Bun test runner (`512dbbe`):** Already in place — `expense-log` unit tests
  import from `bun:test`.
- **Callback URL validation (`f872561`):** `src/lib/url-validation.ts`
  (`validateCallbackUrl`) is already present.
- **`/expenses` vs `/protected`:** Intentional divergence — do **not** "port"
  upstream path/page differences.
- Minor byte-size differences in `better-auth-response-interceptor.ts`,
  `handle-resend-email.ts`, and gated/interest handlers stem from this project's
  expenses-app customization, not from the security fixes above.

---

## 6. Suggested order of work

1. Prerequisites (§3): `email-utils.ts`, `releaseSingleUseCode`, `logger.ts`, `PASSWORD_MAX_LENGTH`.
2. Task 1 (invite codes) — highest impact, depends on §3a/§3b.
3. Task 2 (reset token encoding) — high impact, small.
4. Task 6 (password max length) — small, depends on §3d.
5. Task 7 (logging) — depends on §3c.
6. Task 3 (reset rate-limit) — depends on §3a.
7. Task 5 (e2e portability) — test infrastructure.
8. Task 4 (de-duplicate unit tests) and Task 8 (coverage gaps + `redirects.tsx` decision).
