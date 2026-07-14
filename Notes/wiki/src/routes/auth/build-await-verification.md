# build-await-verification.tsx

**Source:** `src/routes/auth/build-await-verification.tsx`

## Purpose

Page shown after sign-up to inform the user to check their email for a verification link. Includes a resend-email button.

## Export

### `buildAwaitVerification(app): void`

Route: `GET /auth/await-verification`

### Behavior

1. Sets no-cache headers via `setupNoCacheHeaders`.
2. Reads `EMAIL_ENTERED` cookie for the user's email via `retrieveCookie`.
3. If no cookie → redirects to `/auth/sign-in` with empty message.
4. Clears the cookie after reading via `removeCookie`.
5. Renders the await-verification page.

### Page content

- Card with `data-testid='await-verification-page'`
- Shows the email address (from cookie)
- "Back to Sign In" link (`data-testid='back-to-sign-in-action'`)
- "Resend Email" form (`POST /auth/resend-email`) — `data-testid='resend-email-action'` (only shown when email is present)

## Cross-references

- [handle-resend-email.md](handle-resend-email.md) — processes the resend form
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`, `removeCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
