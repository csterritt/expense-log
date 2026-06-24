# build-email-confirmation.tsx

**Source:** `src/routes/auth/build-email-confirmation.tsx`

## Purpose

Handles email verification token callback (`/auth/verify-email`) and shows a confirmation page (`/auth/email-sent`).

## Export

### `buildEmailConfirmation(app): void`

### `GET /auth/verify-email`

1. Sets no-cache headers via `setupNoCacheHeaders`.
2. Reads `token` query param and `callbackUrl` query param.
3. Validates `callbackUrl` via `validateCallbackUrl` against the request origin.
4. If no token → renders failure page.
5. Calls `auth.api.verifyEmail({ query: { token, callbackURL: callbackUrl } })`.
6. On success → renders `alert-success` with "Email Confirmed!" and a "Sign In Now" button (`data-testid='sign-in-after-confirmation'`).
7. On failure/invalid token → renders `alert-error` with "Confirmation Failed" and a "Back to Sign In" button (`data-testid='back-to-sign-in'`).
8. On error → renders `alert-error` with error message.

### `GET /auth/email-sent`

1. Sets no-cache headers via `setupNoCacheHeaders`.
2. Reads `EMAIL_ENTERED` cookie via `retrieveCookie`.
3. If no cookie → redirects to `/auth/sign-in` with `'Please sign up to continue.'`.
4. Clears the cookie via `removeCookie`.
5. Renders a page (`data-testid='email-sent-page'`) confirming the email was sent with a "Back to Sign In" button (`data-testid='back-to-sign-in-from-sent'`).

## Cross-references

- [../../lib/url-validation.md](../../lib/url-validation.md) — `validateCallbackUrl`.
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`, `removeCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
