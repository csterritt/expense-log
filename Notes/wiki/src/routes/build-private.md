# build-private.tsx

**Source:** `src/routes/build-private.tsx`

## Purpose

Protected landing page (`/private`) that requires authentication via `signedInAccess` middleware.

## Export

### `buildPrivate(app): void`

Route: `GET /private`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

Renders:

- Card with title "Private Area"
- Description text about requiring authentication
- Two actions:
  - "Go to Profile" (`/profile`) — `data-testid='visit-profile-action'`
  - "Return Home" (`/`) — `data-testid='visit-home-action'`

## Cross-references

- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — authentication guard
- [build-layout.md](build-layout.md) — layout wrapper

---

See [source-code.md](../../source-code.md) for the full catalog.
