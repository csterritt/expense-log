# src/routes/auth/build-waiting-for-reset.tsx

Route builder for the "waiting for password reset" confirmation page.

## Route Registered

- `GET /auth/waiting-for-reset` — Confirmation page after requesting password reset

## Features

- Reads email from `EMAIL_ENTERED` cookie (consumed on read)
- Shows "Check Your Email" alert with the email address
- Notes that reset link expires in 24 hours
- "Back to Sign In" and "Send Another Reset Link" links
- No-cache headers

## Dependencies

- `../../constants` — `PATHS`, `COOKIES`, `STANDARD_SECURE_HEADERS`
- `../../lib/cookie-support` — `retrieveCookie`, `removeCookie`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
