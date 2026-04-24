# better-auth-response-interceptor.ts

**Source:** `src/routes/auth/better-auth-response-interceptor.ts`

## Purpose

Intercepts requests to `/api/auth/sign-in/email` to convert better-auth's JSON responses into user-friendly redirects with flash messages. On a successful verified sign-in, redirects the user to `/expenses` (the post-sign-in landing page) with the welcome flash. Also handles unverified sign-ins, invalid credentials, rate limits, and other error states.

## Export

### `setupBetterAuthResponseInterceptor(app): void`

Intercepts `POST /api/auth/sign-in/email`.

### Sign-in flow

1. Parses the request body to capture `signInEmail`
2. Calls the original handler
3. If the response is JSON:
   - **`token: null, user: { emailVerified: false }`** — user is unverified → sets `EMAIL_ENTERED` cookie and redirects to `/auth/await-verification` with `'Please verify your email before signing in.'`
   - **`error.code === 'EMAIL_NOT_FOUND'` or `code === 'INVALID_PASSWORD'`** — redirects to `/auth/sign-in` with `'Invalid email or password. Please try again.'`
   - **`error.code === 'ACCOUNT_NOT_FOUND'`** — redirects to `/auth/sign-in` with `'Account not found. Please sign up first.'`
   - **`error.code === 'RATE_LIMITED'`** — redirects to `/auth/sign-in` with `'Too many sign-in attempts. Please try again later.'`
   - **`error.code === 'UNVERIFIED_EMAIL'`** — same unverified redirect as above
   - **`error.code === 'EMAIL_TAKEN'`** — redirects to `/auth/sign-in` with `'This email is already registered.'`
   - **Other JSON errors** — redirects to `/auth/sign-in` with `'An error occurred. Please try again.'`
4. If the response is a 303 redirect (success), passes it through unchanged.

## Cross-references

- [lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`
- [constants.md](../../constants.md) — `PATHS`, `COOKIES`, `MESSAGES`

---

See [source-code.md](../../../source-code.md) for the full catalog.
