# handle-gated-sign-up.ts

**Source:** `src/routes/auth/handle-gated-sign-up.ts`

## Purpose

POST handler for gated sign-up (`POST /auth/sign-up`). Only active in `GATED_SIGN_UP` mode.

## Export

### `handleGatedSignUp(app): void`

### Flow

1. Parses request body
2. Validates with `GatedSignUpFormSchema`
3. If invalid → redirects with error
4. Claims the single-use code via `claimSingleUseCode`
5. If code is already used → redirect with error
6. Calls `processGatedSignUp` from `sign-up-utils.ts` to complete registration

## Cross-references

- [lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `processGatedSignUp`
- [lib/db/auth-access.md](../../lib/db/auth-access.md) — `claimSingleUseCode`

---

See [source-code.md](../../../source-code.md) for the full catalog.
