# src/lib/email-service.ts

Email service for sending confirmation and password reset emails. Uses SMTP transport in test/dev environment and HTTP POST delivery in production.

## Functions

### sendConfirmationEmail(env, email, name, confirmationUrl, token): Promise\<void\>

Sends an HTML + plain text confirmation email with a verification link. Escapes HTML in user name. Throws on failure.

### sendPasswordResetEmail(env, email, name, resetUrl, token): Promise\<void\>

Sends an HTML + plain text password reset email with a reset link. Escapes HTML in user name. Throws on failure.

## Internal

### getEmailConfig(env): EmailConfig

Determines email configuration based on environment. In test mode: SMTP to localhost:1025. In production: uses `EMAIL_SEND_URL` and `EMAIL_SEND_CODE` for HTTP POST delivery.

### createTransporter(env): EmailTransporter

Creates email transporter:
- **Test/dev**: Nodemailer SMTP transport to local MailDev server (port 1025), with test override support via `getTestSmtpConfig()`
- **Production**: HTTP POST to `EMAIL_SEND_URL` with Bearer auth, sending JSON payload

### escapeHtml(str): string

Escapes `&`, `<`, `>`, `"` for XSS prevention in email templates.

## Dependencies

- `nodemailer` — SMTP transport (PRODUCTION:REMOVE)
- `../routes/test/smtp-config` — test SMTP config override (PRODUCTION:REMOVE)
- `../local-types` — `Bindings`
