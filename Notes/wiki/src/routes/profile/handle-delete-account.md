# handle-delete-account.ts

**Source:** `src/routes/profile/handle-delete-account.ts`

## Purpose

POST handler for account deletion (`POST /profile/delete`). Permanently deletes the user and all associated data.

## Export

### `handleDeleteAccount(app): void`

### Flow

1. Gets current user from context (`c.get('user')`)
2. If no user → redirects to `/auth/sign-in` with error
3. Calls `deleteUserAccount(db, user.id)` to delete from DB (cascade deletes sessions and accounts)
4. Calls `auth.api.signOut()` to invalidate the session
5. Redirects to `/` with `'Your account has been deleted.'`

## Cross-references

- [build-delete-confirm.md](build-delete-confirm.md) — confirmation page
- [lib/db-access.md](../../lib/db-access.md) — `deleteUserAccount`

---

See [source-code.md](../../../source-code.md) for the full catalog.
