# setup-no-cache-headers.ts

**Source:** `src/lib/setup-no-cache-headers.ts`

## Purpose

Small utility that sets three response headers to disable caching for authenticated pages.

## Export

### `setupNoCacheHeaders(c): void`

Sets:

- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

Called by `signedInAccess` middleware and any route that should not be cached.

## Cross-references

- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — calls this helper

---

See [source-code.md](../../source-code.md) for the full catalog.
