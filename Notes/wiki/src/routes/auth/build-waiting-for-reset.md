# build-waiting-for-reset.tsx

**Source:** `src/routes/auth/build-waiting-for-reset.tsx`

## Purpose

Page shown after a password reset email is requested (`/auth/waiting-for-reset`). Informs the user to check their email for the reset link.

## Export

### `buildWaitingForReset(app): void`

Route: `GET /auth/waiting-for-reset`

### Behavior

1. Reads `EMAIL_ENTERED` cookie
2. If no cookie → redirects to `/auth/forgot-password` with `'Please enter your email address to reset your password.'`
3. Clears the cookie
4. Renders the waiting page

### Page content

- "Check Your Email" alert showing the email address
- "Back to Sign In" button (`data-testid='back-to-sign-in-from-waiting'`)
- "Send Another Reset Link" button (`/auth/forgot-password`) (`data-testid='try-again-action'`)

---

See [source-code.md](../../../source-code.md) for the full catalog.
