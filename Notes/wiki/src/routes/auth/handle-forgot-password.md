# handle-forgot-password.ts

**Source:** `src/routes/auth/handle-forgot-password.ts`

## Purpose

POST handler for forgot password (`POST /auth/forgot-password`). Initiates the password reset flow via Better Auth.

## Export

### `handleForgotPassword(app): void`

### Flow

1. Parses request body and validates email with `ForgotPasswordFormSchema`. On invalid → redirects to `/auth/forgot-password` with error.
2. Creates DB client via `createDbClient`. Looks up user via `getUserWithAccountByEmail`.
3. If DB error or user not found → silently redirects to waiting page (does not reveal user doesn't exist).
4. Checks rate limit via `checkRateLimit` using `account.updatedAt` and `DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS`. If rate-limited → redirects with `MESSAGE_BUILDERS.passwordResetRateLimit(remainingSeconds)`.
5. Calls `auth.api.requestPasswordReset({ body: { email, redirectTo: '{origin}/auth/reset-password' } })` via `sendPasswordResetEmail`.
6. On email send error → redirects to `/auth/forgot-password` with `'Unable to send password reset email. Please try again later.'`.
7. On success → updates account timestamp via `updateAccountTimestamp`, sets `EMAIL_ENTERED` cookie, redirects to `/auth/waiting-for-reset` with `MESSAGES.RESET_PASSWORD_MESSAGE`.

### Internal helpers

- `checkRateLimit(accountUpdatedAt)` — checks if enough time has elapsed since last reset email.
- `sendPasswordResetEmail(env, email, origin)` — calls Better Auth's `requestPasswordReset` API.
- `updateEmailTimestamp(db, userId)` — updates account timestamp after sending email.
- `redirectToWaitingPage(c, email)` — sets `EMAIL_ENTERED` cookie and redirects to waiting page.
- `processPasswordReset(c, db, userData, email)` — orchestrates rate limit check, email send, timestamp update, and redirect.

## Cross-references

- [build-forgot-password.md](build-forgot-password.md) — GET page
- [build-waiting-for-reset.md](build-waiting-for-reset.md) — waiting page
- [../../lib/db/auth-access.md](../../lib/db/auth-access.md) — `getUserWithAccountByEmail`, `updateAccountTimestamp`, `UserWithAccountData`.
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `ForgotPasswordFormSchema`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `addCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`, `redirectWithMessage`.
- [../../db/client.md](../../db/client.md) — `createDbClient`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES`, `DURATIONS`, `LOG_MESSAGES`, `MESSAGES`, `MESSAGE_BUILDERS`, `VALIDATION`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings`, `DrizzleClient` types.

---

See [source-code.md](../../../source-code.md) for the full catalog.
