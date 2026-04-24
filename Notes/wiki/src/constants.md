# constants.ts

**Source:** `src/constants.ts`

## Purpose

Centralized constants file. All configuration values that would otherwise be magic strings or numbers live here.

## Exports

### `HTML_STATUS`

| Key                 | Value | Usage                            |
| ------------------- | ----- | -------------------------------- |
| `SEE_OTHER`         | `303` | Redirects after form submissions |
| `CONTENT_TOO_LARGE` | `413` | Body limit exceeded response     |

### `PATHS`

Route paths used throughout the application.

- `ROOT` — `/`
- `AUTH.API_BASE` — `/api/auth`
- `AUTH.SIGN_IN_EMAIL_API` — `/api/auth/sign-in/email`
- `AUTH.SIGN_IN` — `/auth/sign-in`
- `AUTH.SIGN_UP` — `/auth/sign-up`
- `AUTH.INTEREST_SIGN_UP` — `/auth/interest-sign-up`
- `AUTH.VERIFY_EMAIL` — `/auth/verify-email`
- `AUTH.EMAIL_SENT` — `/auth/email-sent`
- `AUTH.AWAIT_VERIFICATION` — `/auth/await-verification`
- `AUTH.RESEND_EMAIL` — `/auth/resend-email`
- `AUTH.FORGOT_PASSWORD` — `/auth/forgot-password`
- `AUTH.WAITING_FOR_RESET` — `/auth/waiting-for-reset`
- `AUTH.RESET_PASSWORD` — `/auth/reset-password`
- `AUTH.SET_CLOCK` — `/auth/set-clock` (test only)
- `AUTH.RESET_CLOCK` — `/auth/reset-clock` (test only)
- `AUTH.SET_DB_FAILURES` — `/auth/set-db-failures` (test only)
- `AUTH.CLEAN_SESSIONS` — `/auth/clean-sessions` (test only)
- `AUTH.SIGN_OUT` — `/auth/sign-out`
- `PROFILE` — `/profile`
- `PROFILE_DELETE_CONFIRM` — `/profile/delete-confirm`
- `PROFILE_DELETE` — `/profile/delete`
- `EXPENSES` — `/expenses`
- `CATEGORIES` — `/categories`
- `TAGS` — `/tags`
- `SUMMARY` — `/summary`
- `RECURRING` — `/recurring`

### `COOKIES`

Cookie names and standard options.

- `MESSAGE_FOUND` — flash success message
- `ERROR_FOUND` — flash error message
- `EMAIL_ENTERED` — email for verification flow
- `SESSION` — session identifier
- `DB_FAIL_COUNT` — test-only DB failure count
- `DB_FAIL_INCR` — test-only DB failure increment
- `STANDARD_COOKIE_OPTIONS` — `path: '/'`, `httpOnly: true`, `sameSite: 'Strict'`

### `SIGN_UP_MODES`

- `BOTH_SIGN_UP`
- `GATED_SIGN_UP`
- `INTEREST_SIGN_UP`
- `NO_SIGN_UP`
- `OPEN_SIGN_UP`

### `VALIDATION`

- `EMAIL_PATTERN` — standard email regex
- `REQUIRED` — `'This field is required'`
- `EMAIL_INVALID` — `'Please enter a valid email address.'`
- `NAME_REQUIRED` — `'Name is required'`
- `PASSWORD_MIN_LENGTH` — `'Password must be at least 8 characters long.'`

### `MESSAGES`

User-facing flash messages for common scenarios: unauthorized, invalid input, already signed in, verify email before sign-in, generic errors, registration errors, reset password message, account already exists, new verification email sent.

### `MESSAGE_BUILDERS`

- `passwordResetRateLimit(remainingSeconds)` — rate-limit message for password reset
- `verificationRateLimit(remainingSeconds)` — rate-limit message for verification email resend

### `DURATIONS`

- `EMAIL_RESEND_TIME_IN_MILLISECONDS` — 3 seconds in dev (30 seconds in production)
- `THIRTY_DAYS_IN_SECONDS` — session max age
- `ONE_DAY_IN_SECONDS` — session update age
- `FIVE_MINUTES_IN_SECONDS` — cookie cache max age

### `STANDARD_RETRY_OPTIONS`

- `minTimeout` — 20 ms in dev (200 ms in production)
- `retries` — 5

### `API_URLS`

- `PUSHOVER` — `https://api.pushover.net/1/messages.json`

### `STANDARD_SECURE_HEADERS`

Content Security Policy, Permissions Policy, and referrer policy configuration. Restrictive defaults; `formAction` and `defaultSrc` are expanded in production.

### `ALLOW_SCRIPTS_SECURE_HEADERS`

Same as `STANDARD_SECURE_HEADERS` but allows inline scripts (for service worker registration in renderer) via `scriptSrc` hash and relaxed sandbox.

### `LOG_MESSAGES`

- `DB_UPDATE_ACCOUNT_TS`
- `DB_GET_USER_WITH_ACCOUNT`
- `DB_VALIDATE_SIGN_UP_CODE`

### `UI_TEXT`

- `ENTER_YOUR_EMAIL` — `'Enter your email'`

---

See [source-code.md](../source-code.md) for the full catalog.
