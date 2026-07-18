# src/routes/auth/handle-resend-email.ts

POST handler for resending email verification.

## Route Registered

- `POST /auth/resend-email` — Resend verification email

## Flow

1. Validates email via `ResendEmailFormSchema`
2. Looks up user with account by email
3. If user not found: redirects with generic "new email sent" message (don't reveal account existence)
4. If user already verified: redirects to sign-in
5. Checks rate limit using `account.updatedAt` timestamp
6. If rate limited: redirects with "please wait" message
7. Calls Better Auth `auth.api.sendVerificationEmail`
8. Updates account timestamp for rate limiting
9. Redirects to await-verification with success message

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/validators` — `validateRequest`, `ResendEmailFormSchema`
- `../../lib/db/auth-access` — `getUserWithAccountByEmail`, `updateAccountTimestamp`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `addCookie`
- `../../db/client` — `createDbClient`
- `../../constants` — `PATHS`, `DURATIONS`, `COOKIES`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `LOG_MESSAGES`
