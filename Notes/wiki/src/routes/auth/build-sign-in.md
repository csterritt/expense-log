# src/routes/auth/build-sign-in.tsx

Route builder for the sign-in page.

## Route Registered

- `GET /auth/sign-in` — Sign-in page with email/password form

## Features

- Pre-fills email from `EMAIL_ENTERED` cookie (consumed on read)
- Shows "forgot password" link
- Shows sign-up link (visible only when sign-up mode allows it)
- No-cache headers for authenticated pages
- Validates path parameters via `PathSignInValidationParamSchema`
- Redirects already-signed-in users to expenses

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `SIGN_UP_MODES`, `MESSAGES`, `UI_TEXT`, `COOKIES`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../../lib/cookie-support` — `retrieveCookie`
- `../../lib/validators` — `validateRequest`, `PathSignInValidationParamSchema`
- `../build-layout` — `useLayout`
