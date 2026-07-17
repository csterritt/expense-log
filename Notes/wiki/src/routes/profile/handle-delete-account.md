# src/routes/profile/handle-delete-account.ts

POST handler for account deletion from profile page.

## Route Registered

- `POST /profile/delete` — Delete account permanently (requires sign-in)

## Flow

1. Gets user ID from session context
2. Calls `deleteUserAccount(db, userId)` to delete user and cascade-delete all related data
3. On DB error: redirects back to profile with error message
4. On success: clears Better Auth session cookies, redirects to sign-in with success message
5. Logs all steps via structured logger

## Dependencies

- `../../lib/db/auth-access` — `deleteUserAccount`
- `../../lib/redirects` — `redirectWithMessage`, `redirectWithError`
- `../../lib/cookie-support` — `removeCookie`
- `../../lib/logger` — `logError`, `logInfo`, `sanitizeError`
- `../../middleware/signed-in-access` — auth guard
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
