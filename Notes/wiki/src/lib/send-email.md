# src/lib/send-email.ts

SMTP email sending via Nodemailer with retry logic. Used for OTP verification emails.

## Functions

### sendEmail(env, fromAddress, toAddress, subject, content): Promise\<void\>

Sends an HTML email via SMTP using env-configured server. Validates SMTP config (host, port, user, password). Throws on missing config or send failure.

### sendOtpToUserViaEmail(env, email, otp, emailAgent?): Promise\<Result\<boolean, Error\>\>

Sends an OTP verification code email with retry logic (`STANDARD_RETRY_OPTIONS`). Returns `Result.ok(true)` on success, `Result.err(Error)` on failure. Accepts optional `emailAgent` for dependency injection in tests.

## Internal

### sendOtpToUserViaEmailActual(env, email, otp, emailAgent): Promise\<Result\<boolean, Error\>\>

Actual send implementation wrapped by retry logic. Sends from `noreply@cls.cloud` with subject "Your Expense Log Verification Code".

## Dependencies

- `nodemailer` — SMTP transport
- `async-retry` — retry logic
- `true-myth/result` — Result type
- `../constants` — `STANDARD_RETRY_OPTIONS`
- `../local-types` — `Bindings`
