# sign-up-utils.spec.ts

**Source:** `tests/sign-up-utils.spec.ts`

## Purpose

Unit tests for the error-message sanitization logic from `src/lib/sign-up-utils.ts` (extracted as standalone helpers for testing without Hono context).

## Key logic tested

### `isDuplicateEmailError(message)`

Pattern-matches lowercase strings against: `'already exists'`, `'duplicate'`, `'unique constraint'`, `'unique'`, `'violates unique'`.

### `getErrorMessageForUser(rawErrorMessage)`

- Returns `MESSAGES.ACCOUNT_ALREADY_EXISTS` for duplicate-related errors
- Returns `MESSAGES.REGISTRATION_GENERIC_ERROR` for everything else (including internal errors, stack traces, unknown errors)

## Test cases

- Internal DB errors (`SQLITE_BUSY`) → generic message, no `'SQLITE'` or `'database'` leakage
- Stack traces (`Connection refused at Object...`) → generic message, no `'Connection'` or `'Object'` leakage
- Unknown errors (`Unexpected token...`) → generic message, no `'JSON'` or `'token'` leakage
- Duplicate email errors (`User with this email already exists`) → `MESSAGES.ACCOUNT_ALREADY_EXISTS`
- Unique constraint errors (`UNIQUE constraint failed`) → `MESSAGES.ACCOUNT_ALREADY_EXISTS`
- Sensitive raw errors (D1_ERROR, TypeError, ECONNREFUSED, bcrypt) → all sanitized to generic message with no substring leakage

## Dependencies

- `src/constants` — `MESSAGES`

---

See [tests.md](../tests.md) for the full catalog.
