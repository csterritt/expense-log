# src/routes/auth/build-sign-out.tsx

Route builder for the sign-out success page.

## Route Registered

- `GET /auth/sign-out` — Sign-out success page with "Home" link

## Features

- Shows success alert: "You have been signed out successfully"
- No-cache headers
- Simple card with home link

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
