# handle-change-password.ts

**Source:** `src/routes/profile/handle-change-password.ts`

## Purpose

POST handler for changing password (`POST /profile`). Requires authentication.

## Internal helpers

### `isErrorWithMessage(value): value is { message: string }`

Type-guard arrow function used to detect better-auth thrown errors. Each `if` body is wrapped in braces per the project coding-style rule.

## Export

### `handleChangePassword(app): void`

### Flow

1. Parses request body
2. Validates with `ChangePasswordFormSchema` (currentPassword, newPassword, confirmPassword)
3. If invalid → redirects to `/profile` with error
4. Calls `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true } })`
5. On success → redirects to `/profile` with `'Your password has been changed successfully.'`
6. On failure → redirects to `/profile` with error

## Cross-references

- [build-profile.md](build-profile.md) — GET page
- [lib/validators.md](../../lib/validators.md) — `ChangePasswordFormSchema`

---

See [source-code.md](../../../source-code.md) for the full catalog.
