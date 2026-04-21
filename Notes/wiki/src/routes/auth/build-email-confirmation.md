# build-email-confirmation.tsx

**Source:** `src/routes/auth/build-email-confirmation.tsx`

## Purpose

Handles email verification token callback (`/auth/verify-email`) and shows a confirmation page (`/auth/email-sent`).

## Export

### `buildEmailConfirmation(app): void`

### `GET /auth/verify-email`

1. Reads `token` query param and `callbackUrl` query param
2. Validates `callbackUrl` via `validateCallbackUrl`
3. If no token → renders failure page
4. Calls `auth.api.verifyEmail({ query: { token, callbackURL } })`
5. On success → renders `alert-success` with "Email Confirmed!" and a "Sign In Now" button
6. On failure/invalid token → renders `alert-error` with "Confirmation Failed"

### `GET /auth/email-sent`

1. Reads `EMAIL_ENTERED` cookie
2. If no cookie → redirects to `/auth/sign-in` with `'Please sign up to continue.'`
3. Renders a page confirming the email was sent with a "Back to Sign In" button

## Cross-references

- [lib/url-validation.md](../../lib/url-validation.md) — `validateCallbackUrl`

---

See [source-code.md](../../../source-code.md) for the full catalog.
