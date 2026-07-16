# logger.ts

**Source:** `src/lib/logger.ts`

## Purpose

Structured logging utility that redacts sensitive user data. Provides safe, JSON-formatted log output for `info`, `error`, and `warn` levels.

## Exports

### `sanitizeError(error: unknown): Record<string, unknown>`

Prepares an error value for logging.

- For `Error` instances: returns `{ name, message, stack? }` where `stack` is only included in development.
- For plain objects: returns a copy with keys containing `password`, `token`, `secret`, `key`, `email`, or `authorization` replaced by the literal string `[REDACTED]`.
- For other values: wraps in `{ value: String(error) }`.

### `logInfo(message: string, context?: Record<string, unknown>): void`

Emits a JSON `console.log` line with `level: 'info'`.

### `logError(message: string, context?: Record<string, unknown>): void`

Emits a JSON `console.error` line with `level: 'error'`.

### `logWarn(message: string, context?: Record<string, unknown>): void`

Emits a JSON `console.warn` line with `level: 'warn'`.

## Cross-references

- [../routes/profile/handle-change-password.md](../routes/profile/handle-change-password.md) — uses `logError`/`sanitizeError` for unexpected failures and `logInfo` on success.
- [../routes/profile/handle-delete-account.md](../routes/profile/handle-delete-account.md) — uses `logError`/`logInfo`/`sanitizeError` for delete outcomes.

---

See [source-code.md](../../source-code.md) for the full catalog.
