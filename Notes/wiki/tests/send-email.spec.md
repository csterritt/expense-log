# send-email.spec.ts

**Source:** `tests/send-email.spec.ts`

## Purpose

Unit tests for `sendOtpToUserViaEmail` from `src/lib/send-email.ts`. Uses mock email agents to verify email content and error handling. Imports `describe`/`it` from `bun:test`.

## Test cases

- `sends email with correct content and OTP code` — mock agent (with `env` parameter) captures `env`/`fromAddress`/`toAddress`/`subject`/`content`; verifies result is Ok; asserts `env` is the passed `mockEnv`, `noreply@cls.cloud`, correct recipient, subject `'Your Mini-Auth Verification Code'`; checks HTML contains `<strong>123456</strong>`, `<h1>Verification Code</h1>`, and expiration notice
- `handles email sending failure` — mock agent throws `'Email sending failed'`; verifies result is Err with matching message

## Test setup

- `mockEnv` — a local object with `SMTP_SERVER_PORT`, `SMTP_SERVER_HOST`, `SMTP_SERVER_USER`, and `SMTP_SERVER_PASSWORD` so the `sendOtpToUserViaEmail` signature (`env, email, otp, emailAgent`) is satisfied.

## Dependencies

- `src/lib/send-email`
- `true-myth/result`

---

See [tests.md](../tests.md) for the full catalog.
