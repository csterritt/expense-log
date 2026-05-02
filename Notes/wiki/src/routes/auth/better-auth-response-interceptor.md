# better-auth-response-interceptor.ts

**Source:** `src/routes/auth/better-auth-response-interceptor.ts`

## Purpose

Intercepts POST requests to `/api/auth/sign-in/email` and `/api/auth/sign-up/email` to convert Better Auth's JSON API responses into user-friendly redirects with flash messages.

## Exports

### `setupBetterAuthResponseInterceptor(app): void`

Registers two handlers on `PATHS.AUTH.SIGN_IN_EMAIL_API`:

1. **`captureEmailMiddleware`** — extracts the `email` field from form data before it reaches the handler, storing it in `c.get('signInEmail')` for later use in error responses.
2. **`signInHandler`** — the main `POST` handler that:
   - Converts `application/x-www-form-urlencoded` and `multipart/form-data` requests to JSON (Better Auth requires JSON)
   - Creates a fresh auth instance and calls `auth.handler(jsonRequest)`
   - Interprets the raw response by HTTP status code

### Response handling

| Status    | Condition                                                                        | Action                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **200**   | Response is JSON with `user.emailVerified === false` and URL contains `/sign-up` | Sets `EMAIL_ENTERED` cookie, redirects to `/auth/email-sent` with `'Account created! Please check your email to verify your account.'` |
| **200**   | Response is JSON with `user.emailVerified === false` (sign-in)                   | Redirects to `/auth/sign-in` with `'Please verify your email address before signing in.'`                                              |
| **200**   | Response is JSON with `user.emailVerified === true`                              | Copies Set-Cookie headers from Better Auth response, redirects to `/expenses` with `'Welcome! You have been signed in successfully.'`  |
| **401**   | —                                                                                | Redirects to `/auth/sign-in` with `'Invalid email or password.'`                                                                       |
| **403**   | Error code is `EMAIL_NOT_VERIFIED` and email was captured                        | Sets `EMAIL_ENTERED` cookie, redirects to `/auth/await-verification`                                                                   |
| **403**   | Any other 403                                                                    | Redirects to `/auth/sign-in` with verify-email message                                                                                 |
| **400**   | —                                                                                | Redirects to `/auth/sign-in` with `'Please check your email and password and try again.'`                                              |
| **5xx**   | —                                                                                | Redirects to `/auth/sign-in` with generic error                                                                                        |
| **Other** | —                                                                                | Passes the original response through unchanged                                                                                         |

### Internal helpers

- **`handleUnverifiedSignUp(c, email, isSignUp)`** — redirects new sign-ups to email-sent page
- **`handleVerifiedSignIn(c, response)`** — forwards Better Auth session cookies and redirects to expenses
- **`handleUnverifiedSignIn(c)`** — redirects unverified users trying to sign in
- **`handleSuccessResponse(c, response)`** — parses JSON 200 responses and routes by verification state
- **`handleForbiddenResponse(c, response, capturedEmail)`** — parses 403 for `EMAIL_NOT_VERIFIED` code
- **`handleErrorResponse(c, response, capturedEmail)`** — dispatches by status code (401/403/400/500)
- **`captureEmailMiddleware(c, next)`** — clones request, parses form data, captures email
- **`convertFormDataToJsonRequest(request)`** — converts form submissions to JSON for Better Auth

## Error messages (constants)

- `INVALID_CREDENTIALS` — `'Invalid email or password. Please check your credentials and try again.'`
- `CHECK_CREDENTIALS` — `'Please check your email and password and try again.'`
- `ACCOUNT_CREATED` — `'Account created! Please check your email to verify your account.'`
- `WELCOME` — `'Welcome! You have been signed in successfully.'`

## Cross-references

- [lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`
- [constants.md](../../constants.md) — `PATHS`, `COOKIES`, `MESSAGES`
- [lib/cookie-support.md](../../lib/cookie-support.md) — `addCookie`
- [lib/auth.md](../../lib/auth.md) — `createAuth`

---

See [source-code.md](../../../source-code.md) for the full catalog.
