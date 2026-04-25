# handle-interest-sign-up.ts

**Source:** `src/routes/auth/handle-interest-sign-up.ts`

## Purpose

POST handler for interest/waitlist sign-up (`POST /auth/interest-sign-up`). Only active in `INTEREST_SIGN_UP` mode.

## Export

### `handleInterestSignUp(app): void`

### Flow

1. Parses request body
2. Validates email with `InterestSignUpFormSchema`
3. If invalid → redirects to `/auth/interest-sign-up` with error
4. Adds email to `interestedEmail` table via `addInterestedEmail`
5. If already in waitlist → redirects with `'You are already on the waitlist.'`
6. Otherwise → redirects with `'Thank you! You have been added to the waitlist.'`

## Cross-references

- [build-interest-sign-up.md](build-interest-sign-up.md) — GET page
- [lib/db/auth-access.md](../../lib/db/auth-access.md) — `addInterestedEmail`

---

See [source-code.md](../../../source-code.md) for the full catalog.
