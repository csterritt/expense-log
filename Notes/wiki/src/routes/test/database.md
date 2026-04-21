# database.ts

**Source:** `src/routes/test/database.ts`

## Purpose

Dev-only test endpoints for database operations used by E2E tests. Mounted at `/test/database`.

## Exports

### `testDatabaseRouter`

Hono sub-router with routes:

| Method | Path                    | Purpose                                                                                     |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------- |
| `GET`  | `/clear`                | Truncates all tables (user, session, account, verification, singleUseCode, interestedEmail) |
| `GET`  | `/seed/:code`           | Inserts a single-use code                                                                   |
| `GET`  | `/seed-interest/:email` | Inserts an interested email                                                                 |
| `GET`  | `/verify/:email`        | Marks a user's email as verified                                                            |

## Cross-references

- [e2e-tests/support/db-helpers.md](../../../e2e-tests/support/db-helpers.md) — helpers that call these endpoints

---

See [source-code.md](../../../source-code.md) for the full catalog.
