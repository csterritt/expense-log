# src/routes/auth/handle-forgot-password.ts

POST handler for forgot password requests.

## Route Registered

- `POST /auth/forgot-password` — Send password reset email

## Flow

1. Validates form via `ForgotPasswordFormSchema`
2. Normalizes email
3. Checks in-memory rate limit (per-email, prevents timing side-channel)
4. Looks up user with account by email
5. If user not found: still redirects with success message (don't reveal account existence)
6. Checks DB-based rate limit using `account.updatedAt`
7. Calls Better Auth `auth.api.forgetPassword`
8. Updates account timestamp for rate limiting
9. Stores email in cookie, redirects to waiting-for-reset page

## Rate Limiting

Two layers:
- **In-memory cache** (`emailRateLimitCache`): Per-email, scoped to Worker isolate. Prevents timing attacks by applying uniform rate limiting to known and unknown emails.
- **DB-based**: Uses `account.updatedAt` timestamp. Survives isolate restarts.

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/validators` — `validateRequest`, `ForgotPasswordFormSchema`
- `../../lib/db/auth-access` — `getUserWithAccountByEmail`, `updateAccountTimestamp`
- `../../lib/email-utils` — `normalizeEmail`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `addCookie`
- `../../db/client` — `createDbClient`
- `../../constants` — `PATHS`, `COOKIES`, `STANDARD_SECURE_HEADERS`, `DURATIONS`, `MESSAGES`, `LOG_MESSAGES`, `VALIDATION`
