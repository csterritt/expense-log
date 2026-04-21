# smtp-config.ts

**Source:** `src/routes/test/smtp-config.ts`

## Purpose

Dev-only test endpoint for SMTP configuration. Mounted at `/test`.

## Exports

### `testSmtpRouter`

Hono sub-router with routes:

| Method | Path           | Purpose                                              |
| ------ | -------------- | ---------------------------------------------------- |
| `GET`  | `/smtp-config` | Returns current SMTP host/port configuration as JSON |
| `POST` | `/smtp-config` | Overrides SMTP configuration for testing             |

Used by E2E tests to read emails from the local SMTP test server.

## Cross-references

- [e2e-tests/support/email-helpers.md](../../../e2e-tests/support/email-helpers.md) — helpers that call these endpoints

---

See [source-code.md](../../../source-code.md) for the full catalog.
