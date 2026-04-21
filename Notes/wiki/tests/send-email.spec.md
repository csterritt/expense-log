# send-email.spec.ts

**Source:** `tests/send-email.spec.ts`

## Purpose

Unit tests for `sendOtpToUserViaEmail` from `src/lib/send-email.ts`. Uses mock email agents to verify email content and error handling.

## Test cases

- `sends email with correct content and OTP code` — mock agent captures from/to/subject/content; verifies result is Ok; asserts `noreply@cls.cloud`, correct recipient, subject `'Your Mini-Auth Verification Code'`; checks HTML contains `<strong>123456</strong>`, `<h1>Verification Code</h1>`, and expiration notice
- `handles email sending failure` — mock agent throws `'Email sending failed'`; verifies result is Err with matching message

## Dependencies

- `src/lib/send-email`
- `true-myth/result`

---

See [tests.md](../tests.md) for the full catalog.
