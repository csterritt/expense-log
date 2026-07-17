# src/lib/db/auth-access.ts

Database access layer for auth-related tables: users, accounts, invite codes, and interest signups. All functions use `withRetry` and return `Result` types.

## Types

- `UserWithAccountData` — userId, userName, userEmail, emailVerified, accountUpdatedAt
- `UserIdData` — `{ id: string }`

## Functions

### getUserWithAccountByEmail(db, email): Result\<UserWithAccountData[], Error\>

Joins `user` and `account` tables to get user info + account timestamp for rate limiting.

### getUserIdByEmail(db, email): Result\<UserIdData[], Error\>

Looks up user ID by email.

### updateAccountTimestamp(db, userId): Result\<boolean, Error\>

Updates `account.updatedAt` to current time for rate limiting.

### claimSingleUseCode(db, code, email): Result\<boolean, Error\>

Atomically claims an invite code using `UPDATE ... WHERE email IS NULL`. Returns `true` if claimed, `false` if invalid/already claimed.

### releaseSingleUseCode(db, code, email): Result\<boolean, Error\>

Releases a claimed code back to the pool (sets email to null). Only releases if still claimed by the given email.

### addInterestedEmail(db, email): Result\<boolean, Error\>

Adds email to interest signup list. Returns `false` if already exists (unique constraint), `true` if added.

### checkInterestedEmailExists(db, email): Result\<boolean, Error\>

Checks if email already in interest signup list.

### deleteUserAccount(db, userId): Result\<boolean, Error\>

Deletes user by ID. FK cascade deletes sessions and accounts.

## Dependencies

- `drizzle-orm` — query builders
- `true-myth/result` — Result type
- `../../db/schema` — table definitions
- `../../local-types` — `DrizzleClient`
- `../db-helpers` — `withRetry`, `toResult`
