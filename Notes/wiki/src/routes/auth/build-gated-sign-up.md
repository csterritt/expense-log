# src/routes/auth/build-gated-sign-up.tsx

Route builder for the gated sign-up page (requires invite code).

## Route Registered

- `GET /auth/sign-up` — Gated sign-up page with code + name/email/password form

## Features

- Uses `GatedSignUpForm` component (includes sign-up code field)
- Pre-fills email from `EMAIL_ENTERED` cookie
- "Sign In Instead" link
- No-cache headers
- Redirects already-signed-in users to expenses

## Dependencies

- `../../components/gated-sign-up-form` — `GatedSignUpForm`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `COOKIES`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../../lib/cookie-support` — `retrieveCookie`
- `../build-layout` — `useLayout`
