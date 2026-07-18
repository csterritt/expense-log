# src/routes/auth/build-forgot-password.tsx

Route builder for the "forgot password" page.

## Route Registered

- `GET /auth/forgot-password` — Forgot password form (email input)

## Features

- Simple email input form that posts to `PATHS.AUTH.FORGOT_PASSWORD`
- "Back to Sign In" link
- No-cache headers

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `UI_TEXT`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
