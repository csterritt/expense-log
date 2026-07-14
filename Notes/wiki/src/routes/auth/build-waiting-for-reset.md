# build-waiting-for-reset.tsx

**Source:** `src/routes/auth/build-waiting-for-reset.tsx`

## Purpose

Page shown after a password reset email is requested (`/auth/waiting-for-reset`). Informs the user to check their email for the reset link.

## Export

### `buildWaitingForReset(app): void`

Route: `GET /auth/waiting-for-reset`

### Behavior

1. Sets no-cache headers via `setupNoCacheHeaders`.
2. Reads `EMAIL_ENTERED` cookie via `retrieveCookie`.
3. If no cookie → redirects to `/auth/forgot-password` with `'Please enter your email address to reset your password.'`.
4. Clears the cookie via `removeCookie`.
5. Renders the waiting page.

### Page content

- `data-testid='waiting-for-reset-page'` wrapper
- "Check Your Email" alert showing the email address
- "Back to Sign In" link (`data-testid='back-to-sign-in-from-waiting'`)
- "Send Another Reset Link" link (`/auth/forgot-password`) (`data-testid='try-again-action'`)

## Cross-references

- [handle-forgot-password.md](handle-forgot-password.md) — POST handler that redirects here
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`, `removeCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
