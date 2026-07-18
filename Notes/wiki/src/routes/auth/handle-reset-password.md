# src/routes/auth/handle-reset-password.ts

POST handler for password reset.

## Route Registered

- `POST /auth/reset-password` — Reset password with token

## Flow

1. Validates form via `ResetPasswordFormSchema` (token + password)
2. On validation error: redirects back to reset-password page with token, or forgot-password if no token
3. Calls Better Auth `auth.api.resetPassword` with token and new password
4. On success: redirects to sign-in with success message
5. On token error: redirects to forgot-password with "invalid or expired" message
6. On other error: redirects back to reset-password with token

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/validators` — `validateRequest`, `ResetPasswordFormSchema`
- `../../lib/redirects` — `redirectWithMessage`, `redirectWithError`
- `../../constants` — `MESSAGES`, `PATHS`, `STANDARD_SECURE_HEADERS`
