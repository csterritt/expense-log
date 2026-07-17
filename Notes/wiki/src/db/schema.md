# src/db/schema.ts

Drizzle ORM schema definitions for all database tables. Uses SQLite-compatible types.

## Tables

### user

Better Auth user table: `id` (PK), `name` (unique), `email` (unique), `emailVerified` (boolean), `image`, `createdAt`, `updatedAt`.

### session

Better Auth session table: `id` (PK), `userId` (FK → user, cascade delete), `token` (unique), `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`.

### account

Better Auth account table: `id` (PK), `userId` (FK → user, cascade delete), `accountId`, `providerId`, `accessToken`, `refreshToken`, token expiry dates, `scope`, `idToken`, `password`, `createdAt`, `updatedAt`.

### verification

Better Auth verification table: `id` (PK), `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`.

### singleUseCode

Invite codes for gated sign-up: `code` (PK), `email` (nullable, claimed by setting email).

### interestedEmail

Interest sign-up list: `email` (PK, unique).

### category

Expense categories: `id` (PK), `name`, `createdAt`, `updatedAt`. Has `uniqueIndex` on `lower(name)` for case-insensitive uniqueness.

### tag

Expense tags: `id` (PK), `name`, `createdAt`, `updatedAt`. Has `uniqueIndex` on `lower(name)` for case-insensitive uniqueness.

### recurring

Recurring expense templates: `id` (PK), `description`, `amountCents`, `categoryId` (FK → category, restrict delete), `recurrence`, `anchorDate`, `createdAt`, `updatedAt`.

### expense

Expense entries: `id` (PK), `description`, `amountCents`, `categoryId` (FK → category, restrict delete), `date`, `recurringId` (FK → recurring, set null on delete), `occurrenceDate`, `createdAt`, `updatedAt`. Has `uniqueIndex` on `(recurringId, occurrenceDate)` where `recurringId IS NOT NULL` to prevent duplicate materializations.

### expenseTag

Join table (expense ↔ tag): `expenseId` (FK → expense, cascade delete), `tagId` (FK → tag, restrict delete). Composite primary key.

### recurringTag

Join table (recurring ↔ tag): `recurringId` (FK → recurring, cascade delete), `tagId` (FK → tag, restrict delete). Composite primary key.

## Exports

- `schema` — object with all table definitions
- Inferred select types: `User`, `Session`, `Account`, `Verification`, `InterestedEmail`, `SingleUseCode`, `Category`, `Tag`, `Expense`, `ExpenseTag`, `Recurring`, `RecurringTag`
- Inferred insert types: `NewUser`, `NewSession`, `NewAccount`, `NewVerification`, `NewInterestedEmail`, `NewSingleUseCode`, `NewCategory`, `NewTag`, `NewExpense`, `NewExpenseTag`, `NewRecurring`, `NewRecurringTag`
