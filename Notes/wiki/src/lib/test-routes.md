# test-routes.ts

**Source:** `src/lib/test-routes.ts`

## Purpose

Determines whether dev-only test routes (clock manipulation, database seed/clear, SMTP override) should be mounted. Always returns `false` in production.

## Export

### `isTestRouteEnabled({ nodeEnv, enableTestRoutes, playwright }): boolean`

Returns `false` immediately if `nodeEnv === 'production'`. Otherwise returns `true` if `enableTestRoutes === 'true'` or `playwright === '1'`.

## Cross-references

- [index.md](../index.md) — called during app initialization to decide whether to mount test routers

---

See [source-code.md](../../source-code.md) for the full catalog.
