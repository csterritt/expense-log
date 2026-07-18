# src/lib/setup-no-cache-headers.ts

Sets HTTP headers to prevent caching on authenticated pages.

## Functions

### setupNoCacheHeaders(c: Context): void

Sets three headers on the response:
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

Used on all signed-in pages to prevent browsers from caching sensitive content.
