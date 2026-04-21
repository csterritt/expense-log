# build-reset-password.tsx

**Source:** `src/routes/auth/build-reset-password.tsx`

## Purpose

Password reset form page (`/auth/reset-password`). Requires a valid `token` query parameter.

## Export

### `buildResetPassword(app): void`

Route: `GET /auth/reset-password?token=`

### Behavior

1. Reads `token` query param
2. If no token → renders invalid-token page
3. Otherwise renders the password reset form with the token as a hidden field

### Reset form fields

- **Token** — hidden input with `name='token'` and `value={token}`
- **New Password** — `data-testid='new-password-input'`, `minLength=8`
- **Confirm Password** — `data-testid='confirm-password-input'`, `minLength=8`
- **Submit** — `data-testid='reset-password-action'`

### Invalid token page

- "Invalid Reset Link" alert
- "Request New Reset Link" button (`/auth/forgot-password`)
- "Back to Sign In" link

## Cross-references

- [handle-reset-password.md](handle-reset-password.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
