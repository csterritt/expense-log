# src/routes/profile/handle-change-password.ts

POST handler for password change from profile page.

## Route Registered

- `POST /profile` — Change password (requires sign-in)

## Flow

1. Validates form via `ChangePasswordFormSchema` (currentPassword, newPassword, confirmPassword)
2. On validation error: redirects back to profile with first error message
3. Calls Better Auth `auth.api.changePassword` with current and new password, revoking other sessions
4. On success: redirects to profile with "Password changed successfully" message
5. On error: redirects back with error message (handles credential errors specifically)

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/validators` — `validateRequest`, `ChangePasswordFormSchema`
- `../../lib/redirects` — `redirectWithMessage`, `redirectWithError`
- `../../lib/logger` — `logInfo`, `logError`, `sanitizeError`
- `../../middleware/signed-in-access` — auth guard
- `../../constants` — `MESSAGES`, `PATHS`, `STANDARD_SECURE_HEADERS`
