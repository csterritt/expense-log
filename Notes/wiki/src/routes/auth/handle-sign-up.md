# handle-sign-up.ts

**Source:** `src/routes/auth/handle-sign-up.ts`

## Purpose

POST handler for open sign-up (`POST /auth/sign-up`). Only active in `OPEN_SIGN_UP` mode.

## Export

### `handleSignUp(app): void`

### Flow

1. Parses request body
2. Validates with `SignUpFormSchema`
3. If invalid → redirects to `/auth/sign-in` with `INVALID_INPUT` error
4. Calls `auth.api.signUpEmail({ name, email, password, callbackURL })`
5. Handles synthetic duplicate responses (unverified existing email) by redirecting to await-verification
6. Handles API errors via `handleSignUpApiError`
7. Updates account timestamp in DB
8. Redirects to `/auth/await-verification`

### Internal type

- `SignUpData` — `{ name, email, password }`

## Cross-references

- [lib/sign-up-utils.md](../../lib/sign-up-utils.md) — `handleSignUpApiError`, `isSyntheticDuplicateResponse`, etc.
- [lib/validators.md](../../lib/validators.md) — `SignUpFormSchema`

---

See [source-code.md](../../../source-code.md) for the full catalog.
