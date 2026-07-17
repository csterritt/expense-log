# src/routes/expenses/expense-form-helpers.ts

Helper functions for expense form handling.

## Functions

### emptyState(today): ExpenseFormState

Returns an empty form state with default values: empty description, amount, category, tags; date set to `today`.

### readRawBody(c): Promise\<RawBody\>

Parses form body and returns typed object with: `description`, `amount`, `date`, `category`, `tags`, `tagId` (string[]), `newTags`, `action`. Handles `tagId` as both single and multi-value field.

## Dependencies

- `../../local-types` — `Bindings`
- `./expense-form` — `ExpenseFormState` type
