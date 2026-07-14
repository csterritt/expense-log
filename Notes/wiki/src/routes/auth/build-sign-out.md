# build-sign-out.tsx

**Source:** `src/routes/auth/build-sign-out.tsx`

## Purpose

Sign-out confirmation page (`/auth/sign-out`). Shows a success message after the user is signed out.

## Export

### `buildSignOut(app): void`

Route: `GET /auth/sign-out`

Renders:

- `data-testid='sign-out-page'` wrapper
- `alert-success` with "You have been signed out successfully."
- "Home" button (`/`) — `data-testid='go-home-action'`

Sets no-cache headers via `setupNoCacheHeaders`.

## Cross-references

- [handle-sign-out.md](handle-sign-out.md) — POST handler that actually signs the user out
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/setup-no-cache-headers.md](../../lib/setup-no-cache-headers.md) — `setupNoCacheHeaders`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.SIGN_OUT`, `PATHS.ROOT`, `STANDARD_SECURE_HEADERS`.

---

See [source-code.md](../../../source-code.md) for the full catalog.
