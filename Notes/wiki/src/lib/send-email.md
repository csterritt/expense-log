# send-email.ts

**Source:** `src/lib/send-email.ts`

## Purpose

Lower-level email transport. Creates a Nodemailer SMTP transporter using `env.SMTP_SERVER_*` vars and sends a single email. Also provides an OTP-specific helper with retry.

## Exports

### `sendEmail(env, fromAddress, toAddress, subject, content): Promise<void>`

Validates that `SMTP_SERVER_PORT`, `HOST`, `USER`, and `PASSWORD` are set. Creates a `nodemailer.createTransport` with `secure: true` (TLS), sends the mail, and logs success or throws on error.

### `sendOtpToUserViaEmail(env, email, otp, emailAgent = sendEmail): Promise<Result<boolean, Error>>`

Wraps `sendOtpToUserViaEmailActual` in `async-retry` with `STANDARD_RETRY_OPTIONS`. Sends an HTML email with the OTP code and a 15-minute expiration note. Returns `true` on success, `false` on final error.

## Cross-references

- [constants.md](../constants.md) — `STANDARD_RETRY_OPTIONS`
- [email-service.md](email-service.md) — higher-level template functions

---

See [source-code.md](../../source-code.md) for the full catalog.
