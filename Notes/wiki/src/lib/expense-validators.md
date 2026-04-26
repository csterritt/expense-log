# expense-validators.ts

**Source:** `src/lib/expense-validators.ts`

## Purpose

Validation for the expense-create form, introduced in Issue 04. Replaces the local `validateExpenseForm` helper that the Issue 03 build used to inline a single composed error string. The new module runs every field through its own valibot schema (no short-circuiting), folds the resulting messages into a `FieldErrors` record, and — on success — returns the parsed values with `amount` already converted to integer cents so callers don't have to call `parseAmount` again.

Database-level concerns (e.g. whether the referenced `categoryId` exists) are still enforced by `createExpense`, not here.

## Constants

- `descriptionMax` — `200` in production / `202` for testing.
- `categoryNameMax` — `20` in production / `22` for testing. Added in Issue 05 to cap inline-typed category names. Both follow the project's `PRODUCTION:UNCOMMENT` convention and are re-exported so the entry form can reuse them.

## Schemas

Each is a `pipe(string(...), custom<string>(...), ...)` composition:

- `DescriptionSchema` — required, non-empty after trim, `<= descriptionMax`.
- `AmountSchema` — required and non-empty (the heavy lifting is done by `parseAmount`).
- `DateSchema` — required, non-empty, `isValidYmd(value)` (delegates to `lib/et-date.ts`).
- `CategorySchema` — required, non-empty after trim. Issue 05 renamed this from `CategoryIdSchema` because the entry form now submits the typed *name*, not a category id; existence / creation is handled by the POST handler via `findCategoryByName` + `createCategoryAndExpense`.
- `NewCategoryNameSchema` — required, non-empty after trim, `<= categoryNameMax`. Added in Issue 05 for the confirmation-page flow.
- `ExpenseCreateSchema` — `object({ description, amount, date, category })` for callers that want a single composite schema.

## Types

- `FieldErrors` — `{ description?, amount?, date?, category? }`. A missing key means that field passed validation.
- `RawExpenseCreate` — the four raw string fields read from the form body (`description`, `amount`, `date`, `category`).
- `ParsedExpenseCreate` — `{ description, amountCents, date, category }` (note the `amountCents`, not `amount`; and `category` is the trimmed typed name, not an id).
- `ExpenseCreateInput` — `InferOutput<typeof ExpenseCreateSchema>`, exported for completeness.

## Main entry point

### `parseExpenseCreate(raw: RawExpenseCreate): Result<ParsedExpenseCreate, FieldErrors>`

- Runs each field through its dedicated schema via `safeParse` and collects the first issue's message into the matching `FieldErrors` slot.
- For amount, presence is checked by `AmountSchema`; if it passes, `parseAmount` runs and surfaces its error string verbatim on failure (so the existing `parseAmount` test bodies stay authoritative).
- Returns `Result.err(errors)` when any field failed, otherwise `Result.ok({ description, amountCents, date, category })`.
- All fields are evaluated unconditionally — multi-field failures report every problem at once, which the entry form needs to show errors next to each bad input simultaneously.

### `parseNewCategoryName(input: string): Result<string, string>`

- Introduced in Issue 05. Runs the trimmed input through `NewCategoryNameSchema` and, on success, returns the trimmed value *case-preserved*. Lowercasing is deferred to `createCategoryAndExpense` so the UI can echo the user's casing back on the confirmation page.
- On failure returns a single user-facing string suitable to place under the entry form's `category` field via `redirectWithFormErrors(c, PATHS.EXPENSES, { category: err }, values)`.

## Cross-references

- [money.md](money.md) — `parseAmount` is the underlying numeric validator.
- [et-date.md](et-date.md) — `isValidYmd` enforces calendar dates.
- [form-state.md](form-state.md) — the POST handler hands `FieldErrors` to `redirectWithFormErrors` for round-tripping.
- [../routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — entry-form POST handler that consumes `parseExpenseCreate`.
- [../../tests/expense-validators.spec.md](../../tests/expense-validators.spec.md) — unit coverage (21 tests).

---

See [source-code.md](../../source-code.md) for the full catalog.
