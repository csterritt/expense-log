# src/routes/auth/build-reset-password.tsx

Route builder for the "reset password" page.

## Route Registered

- `GET /auth/reset-password` — Reset password form (token from query param)

## Features

- Reads `token` from query string
- Hidden token field in the form
- New password + confirm password inputs (min 8 characters)
- Form posts to `PATHS.AUTH.RESET_PASSWORD`
- "Back to Sign In" link
- No-cache headers

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
