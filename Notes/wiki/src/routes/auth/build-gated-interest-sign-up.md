# src/routes/auth/build-gated-interest-sign-up.tsx

Route builder for the combined gated + interest sign-up page. Shows both a sign-up code form and a waitlist form.

## Route Registered

- `GET /auth/sign-up` — Combined page with gated sign-up form + waitlist form

## Features

- Upper section: `GatedSignUpForm` component for sign-up with code
- Divider "OR"
- Lower section: Waitlist email form that posts to `PATHS.AUTH.INTEREST_SIGN_UP`
- Pre-fills email from `EMAIL_ENTERED` cookie
- No-cache headers
- Redirects already-signed-in users to expenses

## Dependencies

- `../../components/gated-sign-up-form` — `GatedSignUpForm`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `COOKIES`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../../lib/cookie-support` — `retrieveCookie`
- `../build-layout` — `useLayout`
