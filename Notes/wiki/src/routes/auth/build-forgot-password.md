# build-forgot-password.tsx

**Source:** `src/routes/auth/build-forgot-password.tsx`

## Purpose

Forgot password page (`/auth/forgot-password`) where users enter their email to request a password reset link.

## Export

### `buildForgotPassword(app): void`

Route: `GET /auth/forgot-password`

Renders:

- Card with title "Reset Your Password"
- Form (`POST /auth/forgot-password`) with:
  - Email field — `data-testid='forgot-email-input'`
  - Submit button — `data-testid='forgot-password-action'`
- "Back to Sign In" link — `data-testid='back-to-sign-in-action'`

## Cross-references

- [handle-forgot-password.md](handle-forgot-password.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
