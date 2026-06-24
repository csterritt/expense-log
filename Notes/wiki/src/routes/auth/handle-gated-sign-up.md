# handle-gated-sign-up.ts

**Source:** `src/routes/auth/handle-gated-sign-up.ts`

## Purpose

POST handler for gated sign-up (`POST /auth/sign-up`). Only active in `GATED_SIGN_UP` mode.

## Export

### `handleGatedSignUp(app): void`

### Flow

1. Parses request body and validates with `GatedSignUpFormSchema`. On invalid → redirects to `/auth/sign-up` with error.
2. Delegates to `processGatedSignUp(c, data)` from `sign-up-utils.ts` which handles code claiming and registration.

## Cross-references

- [../../lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `processGatedSignUp`, `GatedSignUpData`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `GatedSignUpFormSchema`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithError`.
- [../../constants.md](../../constants.md) — `PATHS.AUTH.SIGN_UP`, `MESSAGES.INVALID_INPUT`, `MESSAGES.REGISTRATION_GENERIC_ERROR`, `STANDARD_SECURE_HEADERS`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.
- [build-gated-sign-up.md](build-gated-sign-up.md) — GET page.

---

See [source-code.md](../../../source-code.md) for the full catalog.
