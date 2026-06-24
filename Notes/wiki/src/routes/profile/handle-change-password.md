# handle-change-password.ts

**Source:** `src/routes/profile/handle-change-password.ts`

## Purpose

POST handler for changing password (`POST /profile`). Requires authentication via `signedInAccess`.

## Internal helpers

### `isErrorWithMessage(value): value is { message: string }`

Type-guard arrow function used to detect better-auth thrown errors. Each `if` body is wrapped in braces per the project coding-style rule.

## Export

### `handleChangePassword(app): void`

### Flow

1. Parses request body via `c.req.parseBody()`.
2. Validates with `ChangePasswordFormSchema` (currentPassword, newPassword, confirmPassword). On validation error, truncates at first comma and redirects to `/profile` with error (or `MESSAGES.INVALID_INPUT`).
3. Calls `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: c.req.raw.headers })`.
4. On success → redirects to `/profile` with `'Your password has been successfully changed.'`
5. On password-related error → redirects to `/profile` with `'Current password is incorrect. Please try again.'`
6. On other error → redirects to `/profile` with `'An error occurred while changing your password. Please try again.'`

## Cross-references

- [build-profile.md](build-profile.md) — GET page
- [../../lib/auth.md](../../lib/auth.md) — `createAuth`.
- [../../lib/validators.md](../../lib/validators.md) — `validateRequest`, `ChangePasswordFormSchema`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../constants.md](../../constants.md) — `PATHS.PROFILE`, `STANDARD_SECURE_HEADERS`, `MESSAGES.INVALID_INPUT`.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../local-types.md](../../local-types.md) — `AuthUser`, `Bindings` types.

---

See [source-code.md](../../../source-code.md) for the full catalog.
