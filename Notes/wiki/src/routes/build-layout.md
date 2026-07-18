# src/routes/build-layout.tsx

Layout wrapper for all pages. Provides navbar, flash message/error alerts, main content area, and footer.

## Functions

### useLayout(c, children, extraMessage?): HtmlEscapedString

Wraps page content in a standard layout:
- **Navbar**: "Expense Log" brand link, sign-in link (when logged out), or nav links (Expenses, Categories, Tags, Summary, Recurring, Profile, Sign out) when logged in
- **Alerts**: Success alert from `MESSAGE_FOUND` cookie or `extraMessage`, error alert from `ERROR_FOUND` cookie. Cookies are consumed (deleted) after reading
- **Main**: `<main>` container with children
- **Footer**: Copyright with version number

Sets `Content-Type: text/html; charset=utf-8`.

## Dependencies

- `../lib/cookie-support` — `removeCookie`, `retrieveCookie`
- `../constants` — `PATHS`, `COOKIES`
- `../version` — `version`
