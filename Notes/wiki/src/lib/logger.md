# src/lib/logger.ts

Structured JSON logging utility with sensitive data redaction.

## Functions

### sanitizeError(error): Record\<string, unknown\>

Sanitizes errors for safe logging:
- `Error` instances: returns name, message, and stack (dev only)
- Plain objects: redacts keys containing `password`, `token`, `secret`, `key`, `email`, `authorization` (case-insensitive)
- Primitives: returns `{ value: String(error) }`

### logInfo(message, context?): void

Logs JSON with `level: 'info'` + message + context.

### logError(message, context?): void

Logs JSON with `level: 'error'` + message + context to stderr.

### logWarn(message, context?): void

Logs JSON with `level: 'warn'` + message + context to stderr.
