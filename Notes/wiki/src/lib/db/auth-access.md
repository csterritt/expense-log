# auth-access.ts

**Source:** `src/lib/db/auth-access.ts`

## Purpose

Auth-specific database access layer. All queries are wrapped in `withRetry` and return `Result<T, Error>` via `true-myth/result`. Split out from the former `db-access.ts` so it lives alongside `expense-access.ts` under `src/lib/db/`.

## Types

### `UserWithAccountData`

`{ userId, userName, userEmail, emailVerified, accountUpdatedAt }` — used for rate-limiting checks.

### `UserIdData`

`{ id }`

## Internal helpers

### `isUniqueConstraintError(error)`

Recursively checks error messages for SQLite / Drizzle / D1 unique-constraint strings so duplicate inserts can be returned as `Result.ok(false)` instead of errors.

## Exports

### `getUserWithAccountByEmail(db, email): Promise<Result<UserWithAccountData[], Error>>`

Left-joins `user` and `account` on `userId`, filters by `email`, limits to 1.

### `getUserIdByEmail(db, email): Promise<Result<UserIdData[], Error>>`

Selects `id` from `user` where `email`, limits to 1.

### `updateAccountTimestamp(db, userId): Promise<Result<boolean, Error>>`

Sets `account.updatedAt = new Date()` for the given user.

### `claimSingleUseCode(db, code, email): Promise<Result<boolean, Error>>`

Atomically claims a single-use code using `UPDATE ... SET email = ? WHERE code = ? AND email IS NULL`. Returns `true` if exactly 1 row was updated.

### `addInterestedEmail(db, email): Promise<Result<boolean, Error>>`

Inserts into `interestedEmail`. Returns `false` (not error) if email already exists (unique constraint).

### `checkInterestedEmailExists(db, email): Promise<Result<boolean, Error>>`

Selects from `interestedEmail` by email; returns `true` if found.

### `deleteUserAccount(db, userId): Promise<Result<boolean, Error>>`

Deletes the user row. FK cascade deletes associated sessions and accounts. Returns `true` if at least one row was deleted.

## Cross-references

- [db-helpers.md](../db-helpers.md) — `withRetry`, `toResult`
- [constants.md](../constants.md) — `STANDARD_RETRY_OPTIONS`
- [db/schema.md](../../db/schema.md) — table definitions

---

See [source-code.md](../../../source-code.md) for the full catalog.
