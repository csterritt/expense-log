# handle-resend-email.ts

**Source:** `src/routes/auth/handle-resend-email.ts`

## Purpose

POST handler to resend verification email (`POST /auth/resend-email`). Active in all sign-up modes that use email verification. Includes rate limiting.

## Export

### `handleResendEmail(app): void`

### Flow

1. Parses request body and validates with `ResendEmailFormSchema`. On invalid → redirects to `/auth/await-verification` with error.
2. Creates DB client and auth instance. Looks up user via `getUserWithAccountByEmail`.
3. If DB error or user not found → silently sets `EMAIL_ENTERED` cookie and redirects to `/auth/await-verification` with `MESSAGES.NEW_VERIFICATION_EMAIL` (does not reveal user doesn't exist).
4. If user is already verified → redirects to `/auth/sign-in` with `'Your email is already verified. You can sign in now.'`.
5. Checks rate limit using `account.updatedAt` and `DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS`. If rate-limited → sets cookie, redirects with remaining seconds message.
6. Calls `auth.api.sendVerificationEmail({ body: { email, callbackURL: '{origin}/auth/sign-in' } })`.
7. Updates account timestamp via `updateAccountTimestamp` (non-blocking on error).
8. Sets `EMAIL_ENTERED` cookie and redirects to `/auth/await-verification` with `MESSAGES.NEW_VERIFICATION_EMAIL`.

## Cross-references

- [build-await-verification.md](build-await-verification.md) — page that hosts the resend form
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../../lib/db/auth-access.md](../../lib/db/auth-access.md) — `getUserWithAccountByEmail`, `updateAccountTimestamp`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `ResendEmailFormSchema`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `addCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`, `redirectWithMessage`.
- [../../db/client.md](../../db/client.md) — `createDbClient`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `DURATIONS`, `COOKIES`, `MESSAGES`, `LOG_MESSAGES`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.

---

See [source-code.md](../../../source-code.md) for the full catalog.
