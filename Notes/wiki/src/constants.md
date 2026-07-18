# src/constants.ts

Shared constants used throughout the application. All exports are `as const` for type safety.

## Exports

### HTML_STATUS

- `SEE_OTHER: 303` — used for PRG redirects
- `CONTENT_TOO_LARGE: 413` — body limit exceeded

### PATHS

Route path constants organized by feature:
- `PATHS.ROOT` — `/`
- `PATHS.AUTH.*` — auth routes (sign-in, sign-up, verify-email, forgot/reset password, await-verification, resend-email, sign-out, test clock/db routes)
- `PATHS.PROFILE`, `PATHS.PROFILE_DELETE_CONFIRM`, `PATHS.PROFILE_DELETE`
- `PATHS.EXPENSES`, `PATHS.CATEGORIES`, `PATHS.TAGS`, `PATHS.SUMMARY`, `PATHS.RECURRING`

### COOKIES

Cookie names and standard options:
- `MESSAGE_FOUND`, `ERROR_FOUND` — flash message cookies
- `FORM_ERRORS` — per-form field errors + sticky values (single-use)
- `EMAIL_ENTERED` — email persistence across redirects
- `SESSION` — session cookie
- `STANDARD_COOKIE_OPTIONS` — `path: '/'`, `httpOnly: true`, `sameSite: 'Strict'`

### SIGN_UP_MODES

- `BOTH_SIGN_UP`, `GATED_SIGN_UP`, `INTEREST_SIGN_UP`, `NO_SIGN_UP`, `OPEN_SIGN_UP`

### VALIDATION

Email pattern regex and validation messages (required, email invalid, name required, password min/max length).

### MESSAGES

User-facing messages: `UNAUTHORIZED`, `INVALID_INPUT`, `ALREADY_SIGNED_IN`, `VERIFY_EMAIL_BEFORE_SIGN_IN`, `GENERIC_ERROR_TRY_AGAIN`, `REGISTRATION_GENERIC_ERROR`, `RESET_PASSWORD_MESSAGE`, `ACCOUNT_ALREADY_EXISTS`, `NEW_VERIFICATION_EMAIL`.

### MESSAGE_BUILDERS

Functions for rate-limit messages: `passwordResetRateLimit(seconds)`, `verificationRateLimit(seconds)`.

### DURATIONS

- `EMAIL_RESEND_TIME_IN_MILLISECONDS` — 3s dev / 30s prod
- `THIRTY_DAYS_IN_SECONDS`, `ONE_DAY_IN_SECONDS`, `FIVE_MINUTES_IN_SECONDS`

### STANDARD_RETRY_OPTIONS

- `minTimeout: 20` dev / `200` prod, `retries: 5`

### API_URLS

- `PUSHOVER` — Pushover API endpoint

### STANDARD_SECURE_HEADERS

CSP, permissions policy, and referrer policy for routes that don't allow inline scripts. Sandbox allows `same-origin` + `forms` only.

### ALLOW_SCRIPTS_SECURE_HEADERS

Extends `STANDARD_SECURE_HEADERS` with `allow-scripts` sandbox and a sha256-hashed service worker registration script.

### LOG_MESSAGES

DB error message prefixes for logging.

### UI_TEXT

Common UI text constants.
