# src/routes/auth/build-await-verification.tsx

Route builder for the "await email verification" page shown after sign-up.

## Route Registered

- `GET /auth/await-verification` — Verification instructions page

## Features

- Reads email from `EMAIL_ENTERED` cookie (consumed on read)
- Shows "Check Your Email" alert with the email address
- Tips for finding the verification email (spam folder, etc.)
- "Resend verification email" form (posts to `RESEND_EMAIL`)
- "Back to Sign In" link
- No-cache headers

## Dependencies

- `../../constants` — `PATHS`, `COOKIES`, `STANDARD_SECURE_HEADERS`
- `../../lib/cookie-support` — `retrieveCookie`, `removeCookie`
- `../../lib/redirects` — `redirectWithMessage`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
