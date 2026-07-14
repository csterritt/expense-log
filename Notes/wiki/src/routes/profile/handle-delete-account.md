# handle-delete-account.ts

**Source:** `src/routes/profile/handle-delete-account.ts`

## Purpose

POST handler for account deletion (`POST /profile/delete`). Permanently deletes the user and all associated data.

## Export

### `handleDeleteAccount(app): void`

### Flow

1. Gets current user from context (`c.get('user')`) and DB client from context (`c.get('db')`).
2. If no user → redirects to `/auth/sign-in` with error.
3. Calls `deleteUserAccount(db, user.id)` to delete from DB (cascade deletes sessions and accounts).
4. On `Err` or `false` result → redirects to `/profile` with error.
5. Clears better-auth session cookies via `removeCookie(c, 'better-auth.session_token')` and `removeCookie(c, 'better-auth.session_data')`.
6. Redirects to `/auth/sign-in` with `'Your account has been successfully deleted.'`

## Cross-references

- [build-delete-confirm.md](build-delete-confirm.md) — confirmation page
- [../../lib/db/auth-access.md](../../lib/db/auth-access.md) — `deleteUserAccount`.
- [../../lib/cookie-support.md](../../lib/cookie-support.md) — `removeCookie`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../constants.md](../../constants.md) — `PATHS.PROFILE`, `PATHS.PROFILE_DELETE`, `PATHS.AUTH.SIGN_IN`, `STANDARD_SECURE_HEADERS`.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../local-types.md](../../local-types.md) — `AuthUser`, `Bindings`, `DrizzleClient` types.

---

See [source-code.md](../../../source-code.md) for the full catalog.
