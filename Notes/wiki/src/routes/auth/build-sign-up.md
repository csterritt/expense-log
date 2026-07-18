# src/routes/auth/build-sign-up.tsx

Route builder for the open sign-up page.

## Route Registered

- `GET /auth/sign-up` — Sign-up page with name/email/password form

## Features

- Pre-fills email from `EMAIL_ENTERED` cookie (consumed on read)
- Form posts to `PATHS.AUTH.SIGN_UP` (handled by `handle-sign-up.ts`)
- Shows "already have an account?" link to sign-in
- No-cache headers
- Redirects already-signed-in users to expenses

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `UI_TEXT`, `COOKIES`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../../lib/cookie-support` — `retrieveCookie`
- `../build-layout` — `useLayout`
