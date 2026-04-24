# db-helpers.ts

**Source:** `e2e-tests/support/db-helpers.ts`

## Purpose

Database manipulation helpers for E2E tests. Calls the dev-only test endpoints at `/test/database/*` to clear, seed, and inspect the database.

## Exports

### `clearDatabase(): Promise<void>`

DELETE `/test/database/clear` — truncates all auth-related tables.

### `clearSessions(): Promise<void>`

DELETE `/test/database/clear-sessions` — removes all session rows.

### `checkCodeExists(code): Promise<boolean>`

GET `/test/database/code-exists/{code}` — checks if a single-use code exists in the database.

### `seedDatabase(): Promise<void>`

POST `/test/database/seed` — seeds the database with test users, accounts, and single-use codes. Logs how many were created.

### `SeedExpenseRow` (type)

`{ date, description, amountCents, categoryName, tagNames? }` shape sent to the seed-expenses endpoint.

### `seedExpenses(rows): Promise<void>`

POST `/test/database/seed-expenses` — Issue 02. Sends a JSON array of expense seeds. The server creates any missing categories/tags by case-insensitive name and inserts the expense + join rows. Logs the number created.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
