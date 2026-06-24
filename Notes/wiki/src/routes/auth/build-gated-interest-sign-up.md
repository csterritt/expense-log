# build-gated-interest-sign-up.tsx

**Source:** `src/routes/auth/build-gated-interest-sign-up.tsx`

## Purpose

Combined sign-up page (`/auth/sign-up`). Only active in `BOTH_SIGN_UP` mode. Contains both the gated sign-up form (with code) and the interest/waitlist form on the same page.

## Export

### `buildGatedInterestSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Authenticated users are redirected to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Reads `EMAIL_ENTERED` cookie via `retrieveCookie` for pre-populating form fields.
3. Sets no-cache headers via `setupNoCacheHeaders`.
4. Renders the combined form.

### Page layout

- `data-testid='sign-up-page-banner'` wrapper
- **Gated sign-up** section with `<GatedSignUpForm emailEntered={emailEntered} />` component
- **Divider** (`OR`)
- **Interest/waitlist** section:
  - Email field — `data-testid='interest-email-input'` (`type='email'`, pre-populated from cookie)
  - Submit button — `data-testid='interest-action'`

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [../../components/gated-sign-up-form.md](../../components/gated-sign-up-form.md) — `GatedSignUpForm` component.
- [handle-gated-sign-up.md](handle-gated-sign-up.md) — POST handler for gated sign-up.
- [handle-interest-sign-up.md](handle-interest-sign-up.md) — POST handler for interest/waitlist.
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `MESSAGES.ALREADY_SIGNED_IN`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
