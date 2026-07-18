# src/routes/auth/build-interest-sign-up.tsx

Route builder for the interest/waitlist sign-up page.

## Route Registered

- `GET /auth/sign-up` — Waitlist page with email input form

## Features

- Shows "not accepting new accounts" message
- Email input form that posts to `PATHS.AUTH.INTEREST_SIGN_UP`
- Pre-fills email from `EMAIL_ENTERED` cookie
- "Sign In" link
- No-cache headers
- Redirects already-signed-in users to expenses

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `COOKIES`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../../lib/cookie-support` — `retrieveCookie`
- `../build-layout` — `useLayout`
