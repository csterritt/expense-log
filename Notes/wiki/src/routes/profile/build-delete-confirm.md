# build-delete-confirm.tsx

**Source:** `src/routes/profile/build-delete-confirm.tsx`

## Purpose

Account deletion confirmation page (`/profile/delete-confirm`). Requires authentication. Asks the user to confirm before permanently deleting their account. Sets no-cache headers via `setupNoCacheHeaders`.

## Export

### `buildDeleteConfirm(app): void`

Route: `GET /profile/delete-confirm`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='delete-confirm-page'` wrapper
- Warning alert about irreversible deletion
- Confirmation form (`POST /profile/delete`):
  - "Delete This Account" button — `data-testid='confirm-delete-action'`
- "Cancel" link back to `/profile` — `data-testid='cancel-delete-action'`

## Cross-references

- [handle-delete-account.md](handle-delete-account.md) — POST handler
- [build-profile.md](build-profile.md) — profile page
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../constants.md](../../constants.md) — `PATHS.PROFILE`, `PATHS.PROFILE_DELETE_CONFIRM`, `PATHS.PROFILE_DELETE`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
