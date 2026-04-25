# database.ts

**Source:** `src/routes/test/database.ts`

## Purpose

Dev-only test endpoints for database operations used by E2E tests. Mounted at `/test/database`.

All direct Drizzle calls in this file go through a local `runDb<T>(fn)` helper that wraps each operation with `toResult` from [`lib/db-helpers.md`](../../lib/db-helpers.md) and rethrows any `Err` so the surrounding try/catch can produce uniform JSON error responses. This satisfies the project `database-access` rule that "all DB access must go through `withRetry`/`toResult`".

## Exports

### `testDatabaseRouter`

Hono sub-router with routes:

| Method   | Path                 | Purpose                                                                                                                                                                                                                                          |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DELETE` | `/clear`             | Truncates auth + expense tables (`expenseTag`, `expense`, `tag`, `category`, `session`, `account`, `user`, `singleUseCode`, `interestedEmail`)                                                                                                   |
| `DELETE` | `/clear-sessions`    | Clears the `session` table only                                                                                                                                                                                                                  |
| `POST`   | `/seed`              | Seeds canonical test users, accounts, and single-use codes                                                                                                                                                                                       |
| `POST`   | `/seed-expenses`     | Issue 02: accepts a JSON array of `{ date, description, amountCents, categoryName, tagNames? }`; creates categories/tags on the fly (case-insensitive lookup) and inserts the expense rows + join entries. Returns `{ success: true, created }`. |
| `GET`    | `/status`            | Returns row counts for debugging                                                                                                                                                                                                                 |
| `GET`    | `/code-exists/:code` | Reports whether a single-use code is unclaimed                                                                                                                                                                                                   |

## Cross-references

- [e2e-tests/support/db-helpers.md](../../../e2e-tests/support/db-helpers.md) — helpers that call these endpoints

---

See [source-code.md](../../../source-code.md) for the full catalog.
