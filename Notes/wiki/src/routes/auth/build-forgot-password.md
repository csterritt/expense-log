# build-forgot-password.tsx

**Source:** `src/routes/auth/build-forgot-password.tsx`

## Purpose

Forgot password page (`/auth/forgot-password`) where users enter their email to request a password reset link.

## Export

### `buildForgotPassword(app): void`

Route: `GET /auth/forgot-password`

Renders:

- Card with title "Reset Your Password"
- Form (`POST /auth/forgot-password`, `noValidate`) with:
  - Email field — `data-testid='forgot-email-input'` (`autoFocus`, `type='email'`)
  - Submit button — `data-testid='forgot-password-action'`
- "Back to Sign In" link — `data-testid='back-to-sign-in-action'`

Sets no-cache headers via `setupNoCacheHeaders`.

## Cross-references

- [handle-forgot-password.md](handle-forgot-password.md) — POST handler
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.FORGOT_PASSWORD`, `STANDARD_SECURE_HEADERS`, `UI_TEXT.ENTER_YOUR_EMAIL`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
