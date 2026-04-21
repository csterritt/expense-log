# cookie-support.ts

**Source:** `src/lib/cookie-support.ts`

## Purpose

Thin wrappers around Hono's `getCookie`, `setCookie`, `deleteCookie` that apply the app's standard cookie options consistently.

## Exports

### `retrieveCookie(c, name): string | undefined`

Thin wrapper around `getCookie(c, name)`.

### `addCookie(c, name, value, extraOptions?): void`

Calls `setCookie(c, name, value, options)` where `options` starts with `COOKIES.STANDARD_COOKIE_OPTIONS` (`path: '/'`, `httpOnly: true`, `sameSite: 'Strict'`) and merges any extra options.

### `removeCookie(c, name): void`

Calls `deleteCookie(c, name, COOKIES.STANDARD_COOKIE_OPTIONS)`.

## Cross-references

- [constants.md](../constants.md) — `COOKIES`

---

See [source-code.md](../../source-code.md) for the full catalog.
