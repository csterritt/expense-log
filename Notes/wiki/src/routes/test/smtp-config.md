# src/routes/test/smtp-config.ts

Test-only SMTP configuration override endpoints. Entire file stripped in production (`PRODUCTION:STOP`).

## Routes Registered

- `POST /test/set-smtp-config` — Set test SMTP host/port override
- `POST /test/reset-smtp-config` — Clear test SMTP override

## Key Feature

Exports `getTestSmtpConfig()` which returns the current test override (`{ host?, port? }` or `null`). This is used by `email-service.ts` to simulate email failures in E2E tests.

## Dependencies

- `../../constants` — `STANDARD_SECURE_HEADERS`
