# src/routes/profile/build-delete-confirm.tsx

Route builder for the delete account confirmation page.

## Route Registered

- `GET /profile/delete-confirm` — Delete confirmation page (requires sign-in)

## Features

- Warning alert: "This action cannot be undone"
- Explanation that account and all data will be permanently deleted
- Cancel link back to profile, confirm button posts to `PATHS.PROFILE_DELETE`
- No-cache headers

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
- `../../middleware/signed-in-access` — auth guard
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
