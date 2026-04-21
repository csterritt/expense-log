# better-auth-handler.ts

**Source:** `src/routes/auth/better-auth-handler.ts`

## Purpose

Mounts the Better Auth API handler (`/api/auth/*`) and sets up the session/user context injection middleware.

## Exports

### `setupBetterAuth(app): void`

Creates a sub-router at `/api/auth/*` that uses `toNextJsHandler` to bridge Better Auth to Hono. For every request it:

1. Calls `createAuth(c.env)` (fresh auth instance per request)
2. Delegates to Better Auth's request handler

### `setupBetterAuthMiddleware(app): void`

Global middleware that runs `auth.api.getSession()` on every request and injects the result into the Hono context:

- `user` — `session.user`
- `session` — `session.session`
- `authSession` — full `{ user, session }`

Logs `set user to null` when no session exists.

## Cross-references

- [lib/auth.md](../../lib/auth.md) — `createAuth`
- [index.md](../../index.md) — middleware chain registration order

---

See [source-code.md](../../../source-code.md) for the full catalog.
