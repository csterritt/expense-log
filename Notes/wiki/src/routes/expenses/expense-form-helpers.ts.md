# src/routes/expenses/expense-form-helpers.ts

Helper functions for expense form handling. Extracted from `build-expenses.tsx` during the Issue 14B refactoring.

## Purpose

Provides pure utility functions for expense form processing:
- Creating empty form state with default values
- Parsing raw form body from requests

## Exports

### `emptyState(today)`

Creates an empty expense form state with:
- No field errors
- Default empty values for description, amount, category, tags
- Today's date (ET format) for the date field

### `readRawBody(c)`

Asynchronously parses the request body and extracts form fields:
- `description` — string or empty string
- `amount` — string or empty string
- `date` — string or empty string
- `category` — string or empty string
- `tags` — string or empty string
- `action` — string or empty string (used for confirmation page cancel/confirm)

All fields are type-checked and defaulted to empty strings if the form value is not a string.

## Dependencies

- `hono` — `Context` type
- `../../local-types` — `Bindings` type
- `./expense-form` — `ExpenseFormState` type

## Cross-references

- See [build-expenses.tsx](./build-expenses.tsx.md) — the original file that contained these helpers
- See [expense-get-handler.ts](./expense-get-handler.ts.md) — uses `emptyState` for default form state
- See [expense-post-handler.ts](./expense-post-handler.ts.md) — uses `readRawBody` to parse POST data
- See [expense-confirm-post-handler.ts](./expense-confirm-post-handler.ts.md) — uses `readRawBody` to parse POST data
