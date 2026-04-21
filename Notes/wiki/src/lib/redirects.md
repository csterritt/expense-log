# redirects.tsx

**Source:** `src/lib/redirects.tsx`

## Purpose

Helper functions that create 303 redirect responses with flash-message cookies.

## Exports

### `redirectWithMessage(c, redirectUrl, message): Response`

If `message.trim() !== ''`, sets the `COOKIES.MESSAGE_FOUND` cookie (via `addCookie`) then returns `c.redirect(redirectUrl, HTML_STATUS.SEE_OTHER)`.

### `redirectWithError(c, redirectUrl, errorMessage): Response`

Sets the `COOKIES.ERROR_FOUND` cookie (always) then returns `c.redirect(redirectUrl, HTML_STATUS.SEE_OTHER)`.

## Cross-references

- [constants.md](../constants.md) — `HTML_STATUS.SEE_OTHER`, `COOKIES`
- [cookie-support.md](cookie-support.md) — `addCookie`

---

See [source-code.md](../../source-code.md) for the full catalog.
