# expense-validators.ts

**Source:** `src/lib/expense-validators.ts`

## Purpose

Validation for the expense-create form, introduced in Issue 04. Replaces the local `validateExpenseForm` helper that the Issue 03 build used to inline a single composed error string. The new module runs every field through its own valibot schema (no short-circuiting), folds the resulting messages into a `FieldErrors` record, and — on success — returns the parsed values with `amount` already converted to integer cents so callers don't have to call `parseAmount` again.

Database-level concerns (e.g. whether the referenced `categoryId` exists) are still enforced by `createExpense`, not here.

## Constants

- `descriptionMax` — `200` in production / `202` for testing, following the project's `PRODUCTION:UNCOMMENT` convention. Re-exported so the entry form can reuse it.

## Schemas

Each is a `pipe(string(...), custom<string>(...), ...)` composition:

- `DescriptionSchema` — required, non-empty after trim, `<= descriptionMax`.
- `AmountSchema` — required and non-empty (the heavy lifting is done by `parseAmount`).
- `DateSchema` — required, non-empty, `isValidYmd(value)` (delegates to `lib/et-date.ts`).
- `CategoryIdSchema` — required, non-empty after trim.
- `ExpenseCreateSchema` — `object({ description, amount, date, categoryId })` for callers that just want a single composite schema.

## Types

- `FieldErrors` — `{ description?, amount?, date?, category? }`. A missing key means that field passed validation.
- `RawExpenseCreate` — the four raw string fields read from the form body.
- `ParsedExpenseCreate` — `{ description, amountCents, date, categoryId }` (note the `amountCents`, not `amount`).
- `ExpenseCreateInput` — `InferOutput<typeof ExpenseCreateSchema>`, exported for completeness.

## Main entry point

### `parseExpenseCreate(raw: RawExpenseCreate): Result<ParsedExpenseCreate, FieldErrors>`

- Runs each field through its dedicated schema via `safeParse` and collects the first issue's message into the matching `FieldErrors` slot.
- For amount, presence is checked by `AmountSchema`; if it passes, `parseAmount` runs and surfaces its error string verbatim on failure (so the existing `parseAmount` test bodies stay authoritative).
- Returns `Result.err(errors)` when any field failed, otherwise `Result.ok({ description, amountCents, date, categoryId })`.
- All fields are evaluated unconditionally — multi-field failures report every problem at once, which the entry form needs to show errors next to each bad input simultaneously.

## Cross-references

- [money.md](money.md) — `parseAmount` is the underlying numeric validator.
- [et-date.md](et-date.md) — `isValidYmd` enforces calendar dates.
- [form-state.md](form-state.md) — the POST handler hands `FieldErrors` to `redirectWithFormErrors` for round-tripping.
- [../routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — entry-form POST handler that consumes `parseExpenseCreate`.
- [../../tests/expense-validators.spec.md](../../tests/expense-validators.spec.md) — unit coverage (21 tests).

---

See [source-code.md](../../source-code.md) for the full catalog.
