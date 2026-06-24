# smtp-config.ts

**Source:** `src/routes/test/smtp-config.ts`

## Purpose

Dev-only test endpoints for SMTP configuration manipulation. Mounted at `/test`. Guarded by `// PRODUCTION:STOP`. Used by E2E tests to simulate email failures by overriding the SMTP host/port.

## Exports

### `getTestSmtpConfig()`

Returns the current test SMTP config override (`{ host?: string, port?: number } | null`). Used by `email-service.ts` to check for test overrides.

### `testSmtpRouter`

Hono sub-router with routes:

| Method | Path                  | Purpose                                                       |
| ------ | --------------------- | ------------------------------------------------------------- |
| `POST` | `/set-smtp-config`    | Accepts `{ host, port }` JSON body; sets the test SMTP override. Returns `{ success, message, config }`. |
| `POST` | `/reset-smtp-config`  | Clears the test SMTP override (sets to `null`). Returns `{ success, message }`. |

## Cross-references

- [../../constants.md](../../constants.md) — `STANDARD_SECURE_HEADERS`.
- [../../../e2e-tests/support/email-helpers.md](../../../e2e-tests/support/email-helpers.md) — helpers that call these endpoints.

---

See [source-code.md](../../../source-code.md) for the full catalog.
