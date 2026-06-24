# handle-sign-out.ts

**Source:** `src/routes/auth/handle-sign-out.ts`

## Purpose

POST handler for sign-out (`POST /auth/sign-out`). Calls Better Auth to invalidate the session and clear cookies.

## Export

### `handleSignOut(app): void`

### Flow

1. Creates a Better Auth instance via `createAuth(c.env)`.
2. Constructs a synthetic request to `/api/auth/sign-out` with the original headers and calls `auth.handler(authRequest)`.
3. If the response is 200 → creates a redirect to `/auth/sign-out` with empty message, copies all `Set-Cookie` headers from the auth response.
4. On API error or non-200 → manually clears `better-auth.session_token` and `better-auth.session_data` cookies via `removeCookie`, then redirects to `/auth/sign-out` with empty message.
5. On outer catch → redirects to `/auth/sign-out` with `'Internal Server Error'`.

## Cross-references

- [build-sign-out.md](build-sign-out.md) — GET confirmation page
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `removeCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.SIGN_OUT`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.

---

See [source-code.md](../../../source-code.md) for the full catalog.
