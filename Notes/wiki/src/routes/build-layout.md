# build-layout.tsx

**Source:** `src/routes/build-layout.tsx`

## Purpose

Layout wrapper used by every page builder. Wraps page content in a navbar, flash-message area, and footer.

## Exports

### `useLayout(c, children)`

Returns a JSX fragment containing:

1. **Navbar** — DaisyUI `navbar` with app title link and conditional nav items:
   - `Home` (`/`)
   - `Private` (`/private`) — only if user is authenticated
   - `Profile` (`/profile`) — only if user is authenticated
   - `Sign In` (`/auth/sign-in`) — only if user is NOT authenticated
   - `Sign Out` (`/auth/sign-out`) — only if user is authenticated

2. **Flash messages** — checks `MESSAGE_FOUND` and `ERROR_FOUND` cookies, renders `alert-success` or `alert-error` divs, then removes the cookies.

3. **Main content** — `<main className='container mx-auto px-4 py-8'>` with `{children}`

4. **Footer** — simple footer with copyright text

## Cross-references

- [lib/cookie-support.md](../lib/cookie-support.md) — `retrieveCookie`, `removeCookie`
- [local-types.md](../local-types.md) — `AppContext`

---

See [source-code.md](../../source-code.md) for the full catalog.
