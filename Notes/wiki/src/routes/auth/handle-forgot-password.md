# handle-forgot-password.ts

**Source:** `src/routes/auth/handle-forgot-password.ts`

## Purpose

POST handler for forgot password (`POST /auth/forgot-password`). Initiates the password reset flow via Better Auth.

## Export

### `handleForgotPassword(app): void`

### Flow

1. Parses request body
2. Validates email with `ForgotPasswordFormSchema`
3. If invalid → redirects to `/auth/forgot-password` with error
4. Calls `auth.api.forgetPassword({ body: { email, redirectTo: '/auth/reset-password' } })`
5. Sets `EMAIL_ENTERED` cookie
6. Redirects to `/auth/waiting-for-reset` with `'If that email exists, you will receive a password reset link.'`

## Cross-references

- [build-forgot-password.md](build-forgot-password.md) — GET page
- [build-waiting-for-reset.md](build-waiting-for-reset.md) — waiting page

---

See [source-code.md](../../../source-code.md) for the full catalog.
