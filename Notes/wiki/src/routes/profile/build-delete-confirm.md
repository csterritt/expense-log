# build-delete-confirm.tsx

**Source:** `src/routes/profile/build-delete-confirm.tsx`

## Purpose

Account deletion confirmation page (`/profile/delete-confirm`). Requires authentication. Asks the user to confirm before permanently deleting their account.

## Export

### `buildDeleteConfirm(app): void`

Route: `GET /profile/delete-confirm`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- Warning alert about irreversible deletion
- Confirmation form (`POST /profile/delete`):
  - "Delete My Account" button — `data-testid='confirm-delete-action'`
- "Cancel" link back to `/profile` — `data-testid='cancel-delete-action'`

## Cross-references

- [handle-delete-account.md](handle-delete-account.md) — POST handler
- [build-profile.md](build-profile.md) — profile page

---

See [source-code.md](../../../source-code.md) for the full catalog.
