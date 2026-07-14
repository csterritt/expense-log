# handle-sign-up.ts

**Source:** `src/routes/auth/handle-sign-up.ts`

## Purpose

POST handler for open sign-up (`POST /auth/sign-up`). Only active in `OPEN_SIGN_UP` mode.

## Export

### `handleSignUp(app): void`

### Flow

1. Parses request body and validates with `SignUpFormSchema`. On invalid → redirects to `/auth/sign-in` with error.
2. Calls `auth.api.signUpEmail({ body: { name, email, password, callbackURL: '/auth/sign-in/true' } })`.
3. If no response → redirects to `/auth/sign-in` with `MESSAGES.GENERIC_ERROR_TRY_AGAIN`.
4. Checks for response errors via `handleSignUpResponseError`. If error response returned → redirects accordingly.
5. If `isSyntheticDuplicateResponse` → sets `EMAIL_ENTERED` cookie, redirects to `/auth/await-verification` with `MESSAGES.ACCOUNT_ALREADY_EXISTS`.
6. If response status is not 200 → redirects to `/auth/sign-in` with `MESSAGES.GENERIC_ERROR_TRY_AGAIN`.
7. On API throw → delegates to `handleSignUpApiError`.
8. On success → creates DB client via `createDbClient`, calls `updateAccountTimestampAfterSignUp`, then `redirectToAwaitVerification(c, email)`.
9. On outer catch → redirects to `/auth/sign-in` with `MESSAGES.REGISTRATION_GENERIC_ERROR`.

### Internal type

- `SignUpData` — `{ name: string, email: string, password: string }`

## Cross-references

- [../../lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `handleSignUpResponseError`, `handleSignUpApiError`, `getResponseStatus`, `updateAccountTimestampAfterSignUp`, `redirectToAwaitVerification`, `isSyntheticDuplicateResponse`.
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `SignUpFormSchema`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `addCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`, `redirectWithMessage`.
- [../../db/client.md](../../db/client.md) — `createDbClient`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `COOKIES.EMAIL_ENTERED`, `MESSAGES`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.
- [build-sign-up.md](build-sign-up.md) — GET page.

---

See [source-code.md](../../../source-code.md) for the full catalog.
