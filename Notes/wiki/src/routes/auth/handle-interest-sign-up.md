# handle-interest-sign-up.ts

**Source:** `src/routes/auth/handle-interest-sign-up.ts`

## Purpose

POST handler for interest/waitlist sign-up (`POST /auth/interest-sign-up`). Only active in `INTEREST_SIGN_UP` mode.

## Export

### `handleInterestSignUp(app): void`

### Flow

1. Checks if user is already signed in → redirects to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Parses request body and validates with `InterestSignUpFormSchema`. On invalid → sets `EMAIL_ENTERED` cookie if email present, redirects to `/auth/interest-sign-up` with error.
3. Trims and lowercases email, gets DB client from context.
4. Calls `addInterestedEmail(db, email)`. On DB error → sets cookie, redirects with error. If email already exists → redirects to `/auth/sign-in` with "already on waitlist" message. On success → redirects to `/auth/sign-in` with "added to waitlist" message.

## Cross-references

- [build-interest-sign-up.md](build-interest-sign-up.md) — GET page
- [../../lib/db/auth-access.md](../../lib/db/auth-access.md) — `addInterestedEmail`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `InterestSignUpFormSchema`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `addCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`, `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `MESSAGES`, `COOKIES.EMAIL_ENTERED`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings`, `DrizzleClient` types.

---

See [source-code.md](../../../source-code.md) for the full catalog.
