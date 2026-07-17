# src/routes/auth/build-email-confirmation.tsx

Route builder for the email verification callback page.

## Route Registered

- `GET /auth/verify-email` — Email verification callback (token in query param)

## Features

- Reads `callbackURL` from cookie (set during sign-up)
- Validates callback URL via `validateCallbackUrl` to prevent open redirects
- Calls Better Auth's `auth.api.verifyEmail` with the token
- Renders success page with "Sign In Now" link, or error page with retry options
- Clears the `EMAIL_ENTERED` cookie on success
- No-cache headers

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/url-validation` — `validateCallbackUrl`
- `../../lib/cookie-support` — `retrieveCookie`, `removeCookie`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../../constants` — `PATHS`, `COOKIES`, `STANDARD_SECURE_HEADERS`
- `../build-layout` — `useLayout`
