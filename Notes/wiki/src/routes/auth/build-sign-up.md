# build-sign-up.tsx

**Source:** `src/routes/auth/build-sign-up.tsx`

## Purpose

Open sign-up page builder (`/auth/sign-up`). Only active in `OPEN_SIGN_UP` mode.

## Export

### `buildSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Already-authenticated users are redirected to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Reads `EMAIL_ENTERED` cookie via `retrieveCookie` for pre-populating the email field.
3. Sets no-cache headers via `setupNoCacheHeaders`.
4. Renders the open sign-up form.

### Sign-up form fields

- Form posts to `PATHS.AUTH.SIGN_UP` (`POST /auth/sign-up`).
- **Name** — `data-testid='signup-name-input'` (`autoFocus`)
- **Email** — `type='email'`, `data-testid='signup-email-input'` (pre-populated from cookie)
- **Password** — `type='password'`, `minLength=8`, `data-testid='signup-password-input'`
- **Submit** — `data-testid='signup-action'`

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [../../index.md](../../index.md) — registered only in `OPEN_SIGN_UP` mode.
- [handle-sign-up.md](handle-sign-up.md) — POST handler for this form.
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `MESSAGES.ALREADY_SIGNED_IN`, `UI_TEXT.ENTER_YOUR_EMAIL`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
