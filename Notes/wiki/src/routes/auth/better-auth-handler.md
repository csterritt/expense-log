# better-auth-handler.ts

**Source:** `src/routes/auth/better-auth-handler.ts`

## Purpose

Mounts the Better Auth API handler (`/api/auth/*`) and sets up the session/user context injection middleware.

## Exports

### `setupBetterAuth(app): void`

Creates a catch-all route at `/api/auth/*` that delegates to Better Auth's request handler. For every request it:

1. Calls `createAuth(c.env)` (fresh auth instance per request)
2. Delegates to `auth.handler(c.req.raw)`
3. On error, returns HTTP 500 with `'Internal Server Error'`

### `setupBetterAuthMiddleware(app): void`

Global middleware that runs `auth.api.getSession()` on every request and injects the result into the Hono context:

- `user` — `session.user`
- `session` — `session.session`
- `authSession` — full `{ user, session }`

When no session exists or on error, sets all three to `null` and continues. Logs `'Better Auth middleware error:'` on error.

## Cross-references

- [../../lib/auth.md](../../lib/auth.md) — `createAuth`
- [../../local-types.md](../../local-types.md) — `Bindings`, `AuthUser`, `AuthSession`, `AuthSessionResponse` types
- [../../index.md](../../index.md) — middleware chain registration order

---

See [source-code.md](../../../source-code.md) for the full catalog.
