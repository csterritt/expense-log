# handle-gated-interest-sign-up.ts

**Source:** `src/routes/auth/handle-gated-interest-sign-up.ts`

## Purpose

POST handler for combined gated + interest sign-up. Only active in `BOTH_SIGN_UP` mode. Registers two separate POST routes: one for gated sign-up (with code) and one for interest/waitlist sign-up.

## Export

### `handleGatedInterestSignUp(app): void`

### Routes

**`POST /auth/sign-up`** (gated sign-up):

1. Parses request body and validates with `GatedSignUpFormSchema`. On invalid → redirects to `/auth/sign-up` with error.
2. Delegates to `processGatedSignUp(c, data)` from `sign-up-utils.ts`.

**`POST /auth/interest-sign-up`** (interest/waitlist):

1. Checks if user is already signed in → redirects to `/expenses` with `MESSAGES.ALREADY_SIGNED_IN`.
2. Parses request body and validates with `InterestSignUpFormSchema`. On invalid → sets `EMAIL_ENTERED` cookie if email present, redirects to `/auth/sign-up` with error.
3. Trims and lowercases email, gets DB client from context.
4. Calls `addInterestedEmail(db, email)`. On DB error → redirects with error. If email already exists → redirects to `/auth/sign-in` with "already on waitlist" message. On success → redirects to `/auth/sign-in` with "added to waitlist" message.

## Cross-references

- [../../lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `processGatedSignUp`, `GatedSignUpData`.
- [../../lib/db/auth-access.md](../../lib/db/auth-access.md) — `addInterestedEmail`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `GatedSignUpFormSchema`, `InterestSignUpFormSchema`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `addCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`, `redirectWithMessage`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH`, `MESSAGES`, `COOKIES`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings`, `DrizzleClient` types.
- [build-gated-interest-sign-up.md](build-gated-interest-sign-up.md) — GET page.

---

See [source-code.md](../../../source-code.md) for the full catalog.
