# src/lib/redirects.tsx

Redirect helpers with flash message cookies for PRG pattern.

## Functions

### redirectWithMessage(c, redirectUrl, message): Response

Sets `MESSAGE_FOUND` cookie with the message (if non-empty), then redirects (303) to `redirectUrl`.

### redirectWithError(c, redirectUrl, errorMessage): Response

Sets `ERROR_FOUND` cookie with the error message, then redirects (303) to `redirectUrl`.

## Dependencies

- `../constants` — `COOKIES`, `HTML_STATUS`
- `./cookie-support` — `addCookie`
