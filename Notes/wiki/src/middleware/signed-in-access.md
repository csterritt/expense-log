# src/middleware/signed-in-access.ts

Middleware that restricts access to signed-in users only.

## Functions

### signedInAccess: Middleware

Checks `user` and `session` from context (set by Better Auth middleware). If either is missing, redirects to sign-in page with "You must sign in to visit that page" error. On success, sets no-cache headers and calls `next()`.

## Dependencies

- `../constants` — `PATHS`
- `../lib/redirects` — `redirectWithError`
- `../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../local-types` — `Bindings`
