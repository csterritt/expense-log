# src/routes/build-recurring.tsx

Route builder for the recurring templates list page.

## Functions

### buildRecurring(app): void

Registers `GET /recurring` with secure headers + signed-in access. Lists all recurring templates in a table with columns: description, amount, category, tags, recurrence, anchor date, next occurrence, and edit link.

Computes next occurrence using `nextOccurrenceAfter` with today's ET date.

## Dependencies

- `../lib/db/expense-access` — `listRecurring`
- `../lib/recurrence` — `nextOccurrenceAfter`
- `../lib/et-date` — `todayEt`
- `../lib/money` — `formatCents`
- `../lib/redirects` — `redirectWithError`
- `../middleware/signed-in-access` — auth guard
- `./build-layout` — `useLayout`
