# email-service.ts

**Source:** `src/lib/email-service.ts`

## Purpose

Builds HTML/text email templates and sends them. Detects test environments (development, test, Playwright, or `globalThis.test`) and routes to a local smtp-tester on port 1025; in production uses an external POST endpoint.

## Types

### `EmailConfig`

`{ isTestMode, smtpHost?, smtpPort?, smtpUser?, smtpPass?, emailUrl?, emailCode? }`

### `EmailTransporter`

`{ sendMail: (options: MailOptions) => Promise<unknown> }`

## Internal helpers

### `getEmailConfig(env)`

Returns `EmailConfig` based on environment. `isTestMode` is true if `NODE_ENV === 'test'`, `'development'`, `PLAYWRIGHT === '1'`, `process.argv.includes('playwright')`, or `typeof globalThis.test !== 'undefined'`.

### `createTransporter(env)`

- **Test mode** — creates a `nodemailer` transport pointing at the configured host/port (defaults to `127.0.0.1:1025`)
- **Production** — returns a fetch-based transporter that POSTs to `EMAIL_SEND_URL` with Bearer `EMAIL_SEND_CODE`

## Exports

### `sendConfirmationEmail(env, email, name, confirmationUrl, token)`

Sends a styled HTML confirmation email with a button link and a plain-text fallback. Subject: `'Confirm Your Email Address'`. Throws on failure.

### `sendPasswordResetEmail(env, email, name, resetUrl, token)`

Sends a styled HTML password-reset email with a button link. Subject: `'Reset Your Password'`. Throws on failure.

## Cross-references

- [send-email.md](send-email.md) — low-level SMTP transport used in other contexts
- [test/smtp-config.md](../routes/test/smtp-config.md) — `getTestSmtpConfig` override

---

See [source-code.md](../../source-code.md) for the full catalog.
