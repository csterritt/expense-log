# 05-can-resend-verification-email.spec.ts

**Source:** `e2e-tests/sign-up/05-can-resend-verification-email.spec.ts`

## Purpose

Verifies the resend-verification email functionality and rate limiting (3 seconds in test mode). Reads the resent email from Mailpit and completes verification.

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials
- Clicks resend email button (waits 4 seconds for rate limit)
- Verifies success alert: `'A new verification email has been sent.'`
- Reads the latest email from Mailpit
- Verifies recipient and subject
- Extracts and follows the new verification link
- Signs in successfully with verified credentials

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
