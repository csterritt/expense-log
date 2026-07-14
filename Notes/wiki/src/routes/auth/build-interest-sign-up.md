# build-interest-sign-up.tsx

**Source:** `src/routes/auth/build-interest-sign-up.tsx`

## Purpose

Interest/waitlist sign-up page (`/auth/interest-sign-up`). Only active in `INTEREST_SIGN_UP` mode. Allows visitors to join a waitlist by submitting their email.

## Export

### `buildInterestSignUp(app): void`

Route: `GET /auth/interest-sign-up`

### Behavior

1. Authenticated users are redirected to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Reads `EMAIL_ENTERED` cookie via `retrieveCookie` for pre-populating the email field.
3. Sets no-cache headers via `setupNoCacheHeaders`.
4. Renders the interest sign-up form.

### Form fields

- **Email** — `type='email'`, `data-testid='interest-email-input'` (`autoFocus`, pre-populated from cookie)
- **Submit** — `data-testid='interest-action'`

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [handle-interest-sign-up.md](handle-interest-sign-up.md) — POST handler
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `MESSAGES.ALREADY_SIGNED_IN`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
