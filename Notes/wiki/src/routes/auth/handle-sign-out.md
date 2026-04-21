# handle-sign-out.ts

**Source:** `src/routes/auth/handle-sign-out.ts`

## Purpose

POST handler for sign-out (`POST /auth/sign-out`). Calls Better Auth to invalidate the session and clear cookies.

## Export

### `handleSignOut(app): void`

### Flow

1. Calls `auth.api.signOut()` — Better Auth handles session invalidation and cookie clearing
2. Redirects to `/auth/sign-out` (the GET confirmation page)

## Cross-references

- [build-sign-out.md](build-sign-out.md) — GET confirmation page

---

See [source-code.md](../../../source-code.md) for the full catalog.
