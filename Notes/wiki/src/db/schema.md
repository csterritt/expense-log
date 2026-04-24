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

### `category`

Expense categories. Names are unique.

| Column      | Type                | Constraints     |
| ----------- | ------------------- | --------------- |
| `id`        | text                | primaryKey      |
| `name`      | text                | notNull, unique |
| `createdAt` | integer (timestamp) | notNull         |
| `updatedAt` | integer (timestamp) | notNull         |

### `tag`

Expense tags. Names are unique.

| Column      | Type                | Constraints     |
| ----------- | ------------------- | --------------- |
| `id`        | text                | primaryKey      |
| `name`      | text                | notNull, unique |
| `createdAt` | integer (timestamp) | notNull         |
| `updatedAt` | integer (timestamp) | notNull         |

### `recurring`

Recurring expense templates that materialize into `expense` rows over time.

| Column         | Type                | Constraints                                |
| -------------- | ------------------- | ------------------------------------------ |
| `id`           | text                | primaryKey                                 |
| `description`  | text                | notNull                                    |
| `amountCents`  | integer             | notNull                                    |
| `categoryId`   | text                | notNull, references category.id (restrict) |
| `recurrence`   | text                | notNull                                    |
| `anchorDate`   | text                | notNull                                    |
| `createdAt`    | integer (timestamp) | notNull                                    |
| `updatedAt`    | integer (timestamp) | notNull                                    |

### `expense`

Individual expense records, optionally linked to a `recurring` template.

| Column            | Type                | Constraints                                |
| ----------------- | ------------------- | ------------------------------------------ |
| `id`              | text                | primaryKey                                 |
| `description`    | text                | notNull                                    |
| `amountCents`    | integer             | notNull                                    |
| `categoryId`     | text                | notNull, references category.id (restrict) |
| `date`            | text                | notNull                                    |
| `recurringId`    | text                | references recurring.id (set null)         |
| `occurrenceDate` | text                |                                            |
| `createdAt`      | integer (timestamp) | notNull                                    |
| `updatedAt`      | integer (timestamp) | notNull                                    |

Includes a partial unique index `expense_recurring_occurrence_unique` on `(recurringId, occurrenceDate)` filtered to rows where `recurringId IS NOT NULL`. This enforces at most one materialized expense per (template, occurrence) while leaving manual expenses unconstrained.

### `expenseTag`

Join table between `expense` and `tag`.

| Column      | Type | Constraints                                |
| ----------- | ---- | ------------------------------------------ |
| `expenseId` | text | notNull, references expense.id (cascade)   |
| `tagId`     | text | notNull, references tag.id (restrict)      |

Composite primary key `(expenseId, tagId)`.

### `recurringTag`

Join table between `recurring` and `tag`.

| Column        | Type | Constraints                                  |
| ------------- | ---- | -------------------------------------------- |
| `recurringId` | text | notNull, references recurring.id (cascade)   |
| `tagId`       | text | notNull, references tag.id (restrict)        |

Composite primary key `(recurringId, tagId)`.

## Schema export

`schema` re-exports all twelve tables: `user`, `session`, `account`, `verification`, `interestedEmail`, `singleUseCode`, `category`, `tag`, `expense`, `expenseTag`, `recurring`, `recurringTag`.

## Inferred types

For each table: `User`, `NewUser`, `Session`, `NewSession`, `Account`, `NewAccount`, `Verification`, `NewVerification`, `SingleUseCode`, `NewSingleUseCode`, `InterestedEmail`, `NewInterestedEmail`, `Category`, `NewCategory`, `Tag`, `NewTag`, `Expense`, `NewExpense`, `ExpenseTag`, `NewExpenseTag`, `Recurring`, `NewRecurring`, `RecurringTag`, `NewRecurringTag`.

---

See [source-code.md](../../source-code.md) for the full catalog.
