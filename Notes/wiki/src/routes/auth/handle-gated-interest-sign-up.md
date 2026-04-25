# handle-gated-interest-sign-up.ts

**Source:** `src/routes/auth/handle-gated-interest-sign-up.ts`

## Purpose

POST handler for combined gated + interest sign-up (`POST /auth/sign-up`). Only active in `BOTH_SIGN_UP` mode. Routes to either gated sign-up or interest sign-up depending on which form was submitted.

## Export

### `handleGatedInterestSignUp(app): void`

### Flow

1. Parses request body
2. Detects which form was submitted by checking for `code` field:
   - If `code` exists → validates with `GatedSignUpFormSchema` and routes to gated sign-up logic
   - Otherwise → validates with `InterestSignUpFormSchema` and routes to interest sign-up logic
3. Gated flow: claims code, then `processGatedSignUp`
4. Interest flow: adds email to `interestedEmail` table, redirects with success message

## Cross-references

- [lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `processGatedSignUp`
- [lib/db/auth-access.md](../../lib/db/auth-access.md) — `claimSingleUseCode`, `addInterestedEmail`

---

See [source-code.md](../../../source-code.md) for the full catalog.
