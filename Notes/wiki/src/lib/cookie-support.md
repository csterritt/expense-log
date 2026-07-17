# src/lib/cookie-support.ts

Cookie utility functions wrapping Hono's cookie API with standard options.

## Functions

### retrieveCookie(c, name): string | undefined

Gets a cookie value by name using `hono/cookie`'s `getCookie`.

### addCookie(c, name, value, extraOptions?): void

Sets a cookie with `COOKIES.STANDARD_COOKIE_OPTIONS` (path `/`, httpOnly, sameSite Strict). Merges extra options if provided.

### removeCookie(c, name): void

Deletes a cookie using `hono/cookie`'s `deleteCookie` with standard options.

## Dependencies

- `hono/cookie` — `setCookie`, `deleteCookie`, `getCookie`
- `../constants` — `COOKIES.STANDARD_COOKIE_OPTIONS`
- `../local-types` — `Bindings`
