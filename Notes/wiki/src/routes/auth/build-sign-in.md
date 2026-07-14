# build-sign-in.tsx

**Source:** `src/routes/auth/build-sign-in.tsx`

## Purpose

Sign-in page builder (`/auth/sign-in`).

## Export

### `buildSignIn(app): void`

Route: `GET /auth/sign-in/:validationSuccessful?`

### Behavior

1. Already-authenticated users are redirected to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Validates optional `validationSuccessful` path param via `PathSignInValidationParamSchema`. If `'true'`, passes an extra success banner message: `'Your email has been verified successfully. You may now sign in.'`
3. Reads `EMAIL_ENTERED` cookie via `retrieveCookie` for pre-populating the email field.
4. Sets no-cache headers via `setupNoCacheHeaders`.
5. Reads `SIGN_UP_MODE` from `c.env` (defaults to `NO_SIGN_UP`).
6. Renders the sign-in form.

### Sign-in form fields

- Form posts to `PATHS.AUTH.SIGN_IN_EMAIL_API` (Better Auth API endpoint intercepted by response interceptor).
- **Email** — `type='email'`, `data-testid='email-input'` (`autoFocus`, pre-populated from cookie)
- **Password** — `type='password'`, `data-testid='password-input'` (`minLength={8}`)
- **Submit** — `data-testid='submit'`

### Navigation

- "Forgot Password?" link (`/auth/forgot-password`) — `data-testid='forgot-password-action'`
- "Sign Up" / "Join Waitlist" link — `data-testid='go-to-sign-up-action'`, conditional on `SIGN_UP_MODE`:
  - `NO_SIGN_UP` → hidden entirely
  - `INTEREST_SIGN_UP` → links to `/auth/interest-sign-up` with label "Join Waitlist"
  - All other modes → links to `/auth/sign-up` with label "Create Account"

## Cross-references

- [better-auth-response-interceptor.md](better-auth-response-interceptor.md) — intercepts the form POST and converts JSON to redirects.
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `PathSignInValidationParamSchema`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `retrieveCookie`.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `SIGN_UP_MODES`, `MESSAGES.ALREADY_SIGNED_IN`, `COOKIES.EMAIL_ENTERED`, `UI_TEXT.ENTER_YOUR_EMAIL`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.

---

See [source-code.md](../../../source-code.md) for the full catalog.
