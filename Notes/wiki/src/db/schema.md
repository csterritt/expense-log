# schema.ts

**Source:** `src/db/schema.ts`

## Purpose

Drizzle ORM schema definitions for the D1 (SQLite) database. Defines all tables and their columns, plus inferred TypeScript types for inserts and selects.

## Tables

### `user`

| Column          | Type                | Constraints            |
| --------------- | ------------------- | ---------------------- |
| `id`            | text                | primaryKey             |
| `name`          | text                | notNull, unique        |
| `email`         | text                | notNull, unique        |
| `emailVerified` | integer (boolean)   | default false, notNull |
| `image`         | text                |                        |
| `createdAt`     | integer (timestamp) | notNull                |
| `updatedAt`     | integer (timestamp) | notNull                |

### `session`

| Column      | Type                | Constraints                           |
| ----------- | ------------------- | ------------------------------------- |
| `id`        | text                | primaryKey                            |
| `userId`    | text                | notNull, references user.id (cascade) |
| `token`     | text                | notNull, unique                       |
| `expiresAt` | integer (timestamp) | notNull                               |
| `ipAddress` | text                |                                       |
| `userAgent` | text                |                                       |
| `createdAt` | integer (timestamp) | notNull                               |
| `updatedAt` | integer (timestamp) | notNull                               |

### `account`

Better-auth account table. Stores provider info and password hash.

| Column                  | Type                | Constraints                           |
| ----------------------- | ------------------- | ------------------------------------- |
| `id`                    | text                | primaryKey                            |
| `userId`                | text                | notNull, references user.id (cascade) |
| `accountId`             | text                | notNull                               |
| `providerId`            | text                | notNull                               |
| `accessToken`           | text                |                                       |
| `refreshToken`          | text                |                                       |
| `accessTokenExpiresAt`  | integer (timestamp) |                                       |
| `refreshTokenExpiresAt` | integer (timestamp) |                                       |
| `scope`                 | text                |                                       |
| `idToken`               | text                |                                       |
| `password`              | text                |                                       |
| `createdAt`             | integer (timestamp) | notNull                               |
| `updatedAt`             | integer (timestamp) | notNull                               |

### `verification`

Better-auth verification tokens (email verification, password reset).

| Column       | Type                | Constraints |
| ------------ | ------------------- | ----------- |
| `id`         | text                | primaryKey  |
| `identifier` | text                | notNull     |
| `value`      | text                | notNull     |
| `expiresAt`  | integer (timestamp) | notNull     |
| `createdAt`  | integer (timestamp) | notNull     |
| `updatedAt`  | integer (timestamp) | notNull     |

### `singleUseCode`

Gated sign-up codes.

| Column  | Type | Constraints                   |
| ------- | ---- | ----------------------------- |
| `code`  | text | primaryKey                    |
| `email` | text | (nullable — set when claimed) |

### `interestedEmail`

Waitlist emails for interest sign-up mode.

| Column  | Type | Constraints        |
| ------- | ---- | ------------------ |
| `email` | text | primaryKey, unique |

## Inferred types

For each table: `User`, `NewUser`, `Session`, `NewSession`, `Account`, `NewAccount`, `Verification`, `NewVerification`, `SingleUseCode`, `NewSingleUseCode`, `InterestedEmail`, `NewInterestedEmail`.

---

See [source-code.md](../../source-code.md) for the full catalog.
