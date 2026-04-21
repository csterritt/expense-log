# handle-reset-password.ts

**Source:** `src/routes/auth/handle-reset-password.ts`

## Purpose

POST handler for password reset completion (`POST /auth/reset-password`). Validates the reset token and new password.

## Export

### `handleResetPassword(app): void`

### Flow

1. Parses request body
2. Validates with `ResetPasswordFormSchema` (token, password, confirmPassword)
3. If invalid → redirects to `/auth/forgot-password` with error
4. Calls `auth.api.resetPassword({ body: { newPassword: password, token } })`
5. On success → redirects to `/auth/sign-in/true` with `'Your password has been reset. Please sign in with your new password.'`
6. On failure → redirects to `/auth/forgot-password` with error

## Cross-references

- [build-reset-password.md](build-reset-password.md) — GET page
- [lib/validators.md](../../lib/validators.md) — `ResetPasswordFormSchema`

---

See [source-code.md](../../../source-code.md) for the full catalog.
