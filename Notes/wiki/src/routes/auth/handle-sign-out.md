# src/routes/auth/handle-sign-out.ts

POST handler for sign-out.

## Route Registered

- `POST /auth/sign-out` — Sign out current user

## Flow

1. Creates Better Auth instance
2. Constructs a request to `/api/auth/sign-out` and calls `auth.handler`
3. On success (200): redirects to sign-out page, preserving cookie-clearing headers from auth response
4. On failure: manually removes `better-auth.session_token` and `better-auth.session_data` cookies, then redirects
5. Error handling: always redirects to sign-out page

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `removeCookie`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
