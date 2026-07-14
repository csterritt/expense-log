# build-layout.tsx

**Source:** `src/routes/build-layout.tsx`

## Purpose

Layout wrapper used by every page builder. Wraps page content in a navbar, flash-message area, and footer. Also sets the response `Content-Type` header.

## Exports

### `useLayout(c, children, extraMessage?)`

Returns a JSX fragment containing:

1. **Navbar** — DaisyUI `navbar` with app title "Expense Log" linking to `/`, plus conditional nav items:
   - **Signed-out** — single `Sign in` button (`/auth/sign-in`, `data-testid='sign-in-action'`).
   - **Signed-in** — welcome greeting (`Welcome, <name|email|User>!`) followed by:
     - `Expenses` (`/expenses`, `data-testid='expenses-nav'`)
     - `Categories` (`/categories`, `data-testid='categories-nav'`)
     - `Tags` (`/tags`, `data-testid='tags-nav'`)
     - `Summary` (`/summary`, `data-testid='summary-nav'`)
     - `Recurring` (`/recurring`, `data-testid='recurring-nav'`)
     - `Profile` (`/profile`, `data-testid='visit-profile-action'`)
     - `Sign out` — a `<form method='post' action='/auth/sign-out'>` submit button (`data-testid='sign-out-action'`).

2. **Flash messages** — reads `MESSAGE_FOUND` (or `extraMessage`) and `ERROR_FOUND` cookies, renders `alert-success` / `alert-error` divs with SVG icons, then removes the cookies.

3. **Main content** — `<main className='flex-1 container mx-auto px-4 py-8'>` with `{children}`.

4. **Footer** — DaisyUI `footer-center` with `Copyright © 2025 V-{version}`.

## Cross-references

- [lib/cookie-support.md](../lib/cookie-support.md) — `retrieveCookie`, `removeCookie`
- [constants.md](../constants.md) — `PATHS` (expense feature paths, `AUTH.SIGN_IN`, `PROFILE`), `COOKIES`
- [version.md](../version.md) — footer version string

---

See [source-code.md](../../source-code.md) for the full catalog.
