# build-sign-out.tsx

**Source:** `src/routes/auth/build-sign-out.tsx`

## Purpose

Sign-out confirmation page (`/auth/sign-out`). Shows a success message after the user is signed out.

## Export

### `buildSignOut(app): void`

Route: `GET /auth/sign-out`

Renders:

- `alert-success` with "You have been signed out successfully."
- "Home" button (`/`) — `data-testid='go-home-action'`

## Cross-references

- [handle-sign-out.md](handle-sign-out.md) — POST handler that actually signs the user out

---

See [source-code.md](../../../source-code.md) for the full catalog.
