# handle-resend-email.ts

**Source:** `src/routes/auth/handle-resend-email.ts`

## Purpose

POST handler to resend verification email (`POST /auth/resend-email`). Active in all sign-up modes that use email verification. Includes rate limiting.

## Export

### `handleResendEmail(app): void`

### Flow

1. Parses request body for `email`
2. Validates email with `EmailSchema`
3. If invalid → redirects to `/auth/sign-in` with error
4. Checks `EMAIL_RESEND_TIME_IN_MILLISECONDS` rate limit (stored in DB or via in-memory check)
5. If rate limited → redirects with remaining time message
6. Otherwise → triggers `auth.api.sendVerificationEmail` and redirects to `/auth/await-verification` with success message

## Cross-references

- [constants.md](../../constants.md) — `DURATIONS.EMAIL_RESEND_TIME_IN_MILLISECONDS`

---

See [source-code.md](../../../source-code.md) for the full catalog.
