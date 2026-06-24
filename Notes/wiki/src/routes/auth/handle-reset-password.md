# handle-reset-password.ts

**Source:** `src/routes/auth/handle-reset-password.ts`

## Purpose

POST handler for password reset completion (`POST /auth/reset-password`). Validates the reset token and new password.

## Export

### `handleResetPassword(app): void`

### Flow

1. Parses request body and validates with `ResetPasswordFormSchema` (token, password, confirmPassword). On invalid → truncates error at first comma, redirects to `/auth/reset-password?token={token}` (if token present) or `/auth/forgot-password` with error.
2. Calls `auth.api.resetPassword({ body: { token, newPassword: password } })`.
3. On success → redirects to `/auth/sign-in` with `'Your password has been successfully reset. You can now sign in with your new password.'`.
4. On token/expired/invalid error → redirects to `/auth/forgot-password` with `'The reset link is invalid or has expired. Please request a new password reset link.'`.
5. On other error → redirects to `/auth/reset-password?token={token}` with `'An error occurred while resetting your password. Please try again.'`.
6. On outer catch → redirects to `/auth/forgot-password` with `'An error occurred. Please try again.'`.

## Cross-references

- [build-reset-password.md](build-reset-password.md) — GET page
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `ResetPasswordFormSchema`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `MESSAGES.INVALID_INPUT`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.

---

See [source-code.md](../../../source-code.md) for the full catalog.
