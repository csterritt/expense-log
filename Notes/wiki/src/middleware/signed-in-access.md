# signed-in-access.ts

**Source:** `src/middleware/signed-in-access.ts`

## Purpose

Protects private routes by requiring an active Better Auth session.

## Export

### `signedInAccess(c, next): Promise<Response | void>`

1. Sets no-cache headers via `setupNoCacheHeaders`
2. Checks `c.get('user')` (set by `setupBetterAuthMiddleware`)
3. If `user` is null → redirects to `PATHS.AUTH.SIGN_IN` with error message `'You must sign in to visit that page'`
4. Otherwise → calls `next()`

## Cross-references

- [lib/setup-no-cache-headers.md](../lib/setup-no-cache-headers.md) — cache-busting headers
- [routes/auth/better-auth-handler.md](../routes/auth/better-auth-handler.md) — middleware that sets `user` context

---

See [source-code.md](../../source-code.md) for the full catalog.
