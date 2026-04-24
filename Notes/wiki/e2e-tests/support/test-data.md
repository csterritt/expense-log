# test-data.ts

**Source:** `e2e-tests/support/test-data.ts`

## Purpose

Centralized test data to eliminate hardcoded credentials across E2E tests.

## Exports

### `TEST_USERS`

| Key               | Email                                | Password                | Name              |
| ----------------- | ------------------------------------ | ----------------------- | ----------------- |
| `KNOWN_USER`      | `fredfred@team439980.testinator.com` | `freds-clever-password` | `FredF`           |
| `NEW_USER`        | `testuser@example.com`               | `securepassword123`     | `Test User`       |
| `DUPLICATE_USER`  | `duplicate@example.com`              | `password123`           | `Duplicate User`  |
| `GATED_USER`      | `gated-test@example.com`             | `securepassword123`     | `Gated Test User` |
| `INTERESTED_USER` | `interested-user@example.com`        | `securepassword123`     | `Interested User` |
| `RESET_USER`      | `reset-test@example.com`             | `newpassword123`        | `Reset User`      |

### `GATED_CODES`

`WELCOME`, `BETA`, `EARLY_BIRD`, `PREMIUM`, `DEVELOPER`

### `INVALID_DATA`

- `EMAILS` — array of malformed emails
- `PASSWORDS` — empty, too short, too simple
- `CODES` — invalid code strings

### `ERROR_MESSAGES`

Constant strings for all expected flash/alert messages: invalid credentials, email not verified, must sign in, sign-out success, sign-in success, invalid email, duplicate email, invalid code, waitlist success/already on waitlist, reset link sent, password reset success, account deleted.

### `BASE_URLS`

All application URLs used in tests, including `HOME`, `SIGN_IN`, `SIGN_UP`, `INTEREST_SIGN_UP`, `FORGOT_PASSWORD`, `AWAIT_VERIFICATION`, `EXPENSES` (`/expenses` — the protected landing page; replaces the previous `PRIVATE` entry), `WAITING_FOR_RESET`, `SIGN_OUT`, `PROFILE`, and `PROFILE_DELETE_CONFIRM`.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
