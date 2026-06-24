# build-reset-password.tsx

**Source:** `src/routes/auth/build-reset-password.tsx`

## Purpose

Password reset form page (`/auth/reset-password`). Requires a valid `token` query parameter.

## Export

### `buildResetPassword(app): void`

Route: `GET /auth/reset-password?token=`

### Behavior

1. Sets no-cache headers via `setupNoCacheHeaders`.
2. Reads `token` query param.
3. If no token → renders invalid-token page (`data-testid='invalid-token-page'`).
4. Otherwise renders the password reset form (`data-testid='reset-password-page'`) with the token as a hidden field.

### Reset form fields

- **Token** — hidden input with `name='token'` and `value={token}`
- **New Password** — `data-testid='new-password-input'`, `minLength=8`, `autoFocus`
- **Confirm Password** — `data-testid='confirm-password-input'`, `minLength=8`
- **Submit** — `data-testid='reset-password-action'`

### Invalid token page

- `data-testid='invalid-token-page'`
- "Invalid Reset Link" alert
- "Request New Reset Link" button (`/auth/forgot-password`) — `data-testid='request-new-reset-action'`
- "Back to Sign In" link — `data-testid='back-to-sign-in-from-invalid'`

## Cross-references

- [handle-reset-password.md](handle-reset-password.md) — POST handler
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.RESET_PASSWORD`, `PATHS.AUTH.FORGOT_PASSWORD`, `PATHS.AUTH.SIGN_IN`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
