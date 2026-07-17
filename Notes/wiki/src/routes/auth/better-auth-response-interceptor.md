# src/routes/auth/better-auth-response-interceptor.ts

Middleware that intercepts Better Auth API responses to provide user-friendly redirects for sign-in and sign-up flows.

## Routes Intercepted

- `POST /api/auth/sign-in/email` — Sign-in responses
- `POST /api/auth/sign-up/email` — Sign-up responses

## Behavior

### Success (200) Responses

- **Unverified sign-up**: Redirects to email verification page with "Account created" message, stores email in cookie
- **Verified sign-in**: Redirects to expenses page with "Welcome" message, preserves session cookies from original response
- **Unverified sign-in**: Redirects back to sign-in with "Verify email first" message

### Error Responses

- **401/403**: Invalid credentials — redirects to sign-in with error message
- **409**: Duplicate account — redirects to sign-in with "account exists" message
- **Other errors**: Generic error redirect

## Internal Helpers

- `handleUnverifiedSignUp(c, email, isSignUp)` — Redirect to verification page
- `handleVerifiedSignIn(c, response)` — Redirect to expenses, preserving cookies
- `handleUnverifiedSignIn(c)` — Redirect back to sign-in
- `handleSuccessResponse(c, response)` — Parse JSON and dispatch
- `handleErrorResponse(c, response)` — Parse error and redirect

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `addCookie`
- `../../constants` — `PATHS`, `COOKIES`, `MESSAGES`
