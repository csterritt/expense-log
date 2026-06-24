# build-gated-sign-up.tsx

**Source:** `src/routes/auth/build-gated-sign-up.tsx`

## Purpose

Gated sign-up page (`/auth/sign-up`). Only active in `GATED_SIGN_UP` mode. Requires a single-use code.

## Export

### `buildGatedSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Authenticated users are redirected to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Reads `EMAIL_ENTERED` cookie via `retrieveCookie` for pre-populating the email field.
3. Sets no-cache headers via `setupNoCacheHeaders`.
4. Renders the gated sign-up form.

### Form

Uses the shared `<GatedSignUpForm emailEntered={emailEntered} />` component.

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [../../components/gated-sign-up-form.md](../../components/gated-sign-up-form.md) — `GatedSignUpForm` component.
- [handle-gated-sign-up.md](handle-gated-sign-up.md) — POST handler.
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `MESSAGES.ALREADY_SIGNED_IN`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
