# build-profile.tsx

**Source:** `src/routes/profile/build-profile.tsx`

## Purpose

User profile page (`/profile`). Requires authentication via `signedInAccess` middleware. Displays account information and provides forms to change password or delete account. Sets no-cache headers via `setupNoCacheHeaders`.

## Export

### `buildProfile(app): void`

Route: `GET /profile`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='profile-page'` wrapper
- User info section showing name (`data-testid='profile-name'`) and email (`data-testid='profile-email'`)
- "Back" link to `/expenses` — `data-testid='go-back-action'`
- **Change Password** form (`POST /profile`, `noValidate`):
  - Current password — `data-testid='current-password-input'`
  - New password — `data-testid='new-password-input'` (`minLength={8}`)
  - Confirm new password — `data-testid='confirm-password-input'` (`minLength={8}`)
  - Humorous question of the day — `data-testid='humorous-question'` (deterministic by day of year)
  - Submit — `data-testid='change-password-action'`
- **Delete Account** section with link to `/profile/delete-confirm` — `data-testid='delete-account-action'`

## Cross-references

- [handle-change-password.md](handle-change-password.md) — POST handler for password changes
- [build-delete-confirm.md](build-delete-confirm.md) — deletion confirmation page
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../constants.md](../../constants.md) — `PATHS.PROFILE`, `PATHS.PROFILE_DELETE_CONFIRM`, `PATHS.EXPENSES`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `AuthUser`, `Bindings` types.

---

See [source-code.md](../../../source-code.md) for the full catalog.
