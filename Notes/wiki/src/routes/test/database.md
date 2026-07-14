# database.ts

**Source:** `src/routes/test/database.ts`

## Purpose

Dev-only test endpoints for database operations used by E2E tests. Mounted at `/test/database`.

All direct Drizzle calls in this file go through a local `runDb<T>(fn)` helper that wraps each operation with `toResult` from [`lib/db-helpers.md`](../../lib/db-helpers.md) and rethrows any `Err` so the surrounding try/catch can produce uniform JSON error responses. This satisfies the project `database-access` rule that "all DB access must go through `withRetry`/`toResult`".

## Exports

### `testDatabaseRouter`

Hono sub-router with routes:

| Method   | Path                          | Purpose                                                                                                                                                                                                                                          |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DELETE` | `/clear`                      | Truncates all tables (`expenseTag`, `expense`, `recurringTag`, `recurring`, `tag`, `category`, `session`, `account`, `user`, `singleUseCode`, `interestedEmail`)                                                                                 |
| `DELETE` | `/clear-sessions`             | Clears the `session` table only                                                                                                                                                                                                                  |
| `POST`   | `/seed`                       | Seeds canonical test users, accounts, and single-use codes                                                                                                                                                                                       |
| `POST`   | `/seed-expenses`              | Issue 02: accepts a JSON array of `{ date, description, amountCents, categoryName, tagNames? }`; creates categories/tags on the fly (case-insensitive lookup) and inserts the expense rows + join entries. Returns `{ success: true, created }`. |
| `POST`   | `/seed-categories`            | Issue 03: accepts a JSON array of `{ name }`; inserts categories de-duplicated case-insensitively against existing rows. Returns `{ success: true, created }`.                                                                                   |
| `POST`   | `/seed-tags`                  | Accepts a JSON array of `{ name }`; inserts tags de-duplicated case-insensitively against existing rows. Returns `{ success: true, created }`.                                                                                                   |
| `POST`   | `/seed-recurring-templates`   | Accepts a JSON array of `{ description, amountCents, categoryName, tagNames?, recurrence, anchorDate, createdAtIso? }`; upserts categories/tags and inserts recurring templates + `recurringTag` links. Returns `{ success: true, ids }`.        |
| `POST`   | `/seed-generated-expense`     | Accepts `{ recurringId, date, occurrenceDate, description?, amountCents?, categoryId? }`; loads the recurring template via `getRecurringById` and inserts a generated expense row linked to it. Returns `{ success: true, id }`.                 |
| `GET`    | `/status`                     | Returns row counts for `user`, `account`, `session`, `singleUseCode`, `interestedEmail` tables                                                                                                                                                  |
| `GET`    | `/code-exists/:code`          | Reports whether a single-use code is unclaimed (no `email` set)                                                                                                                                                                                  |

## Cross-references

- [../../db/client.md](../../db/client.md) — `createDbClient`.
- [../../db/schema.md](../../db/schema.md) — table definitions imported directly.
- [../../lib/db-helpers.md](../../lib/db-helpers.md) — `toResult` (wrapped by local `runDb`).
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `getRecurringById` (used by `/seed-generated-expense`).
- [../../constants.md](../../constants.md) — `STANDARD_SECURE_HEADERS`.
- [../../../e2e-tests/support/db-helpers.md](../../../e2e-tests/support/db-helpers.md) — helpers that call these endpoints.

---

See [source-code.md](../../../source-code.md) for the full catalog.
