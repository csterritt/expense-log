# expense-validators.ts

**Source:** `src/lib/expense-validators.ts`

## Purpose

Validation for expense forms, category-management forms, and tag-management forms. Introduced in Issue 04 for expense creation, then extended for inline category/tag creation, edit flows, Issue 09 category management, and Issue 10 tag management. The module runs fields through dedicated validators, folds messages into a `FieldErrors` record, and returns parsed values on success.

Database-level concerns (e.g. whether the referenced `categoryId` exists) are still enforced by `createExpense`, not here.

## Constants

- `descriptionMax` — `200` in production / `202` for testing.
- `categoryNameMax` — `20` in production / `22` for testing. Added in Issue 05 to cap inline-typed category names.
- `tagNameMax` — `20` in production / `22` for testing. Added in Issue 06 to cap a single tag name. All three follow the project's `PRODUCTION:UNCOMMENT` convention and are re-exported so the entry form can reuse them for `<input maxlength>` sizing.

## Schemas

Each is a `pipe(string(...), custom<string>(...), ...)` composition:

- `DescriptionSchema` — required, non-empty after trim, `<= descriptionMax`.
- `AmountSchema` — required and non-empty (the heavy lifting is done by `parseAmount`).
- `DateSchema` — required, non-empty, `isValidYmd(value)` (delegates to `lib/et-date.ts`).
- `CategorySchema` — required, non-empty after trim. Issue 05 renamed this from `CategoryIdSchema` because the entry form now submits the typed *name*, not a category id; existence / creation is handled by the POST handler via `findCategoryByName` + `createCategoryAndExpense`.
- `NewCategoryNameSchema` — required, non-empty after trim, `<= categoryNameMax`. Added in Issue 05 for the confirmation-page flow.
- `ExpenseCreateSchema` — `object({ description, amount, date, category })` for callers that want a single composite schema.

## Types

- `FieldErrors` — `{ description?, amount?, date?, category?, tags?, name?, id?, sourceId?, targetId? }`. A missing key means that field passed validation. Issue 09 added the category-management slots.
- `RawExpenseCreate` — the four raw string fields read from the form body (`description`, `amount`, `date`, `category`).
- `ParsedExpenseCreate` — `{ description, amountCents, date, category }` (note the `amountCents`, not `amount`; and `category` is the trimmed typed name, not an id).
- `ExpenseCreateInput` — `InferOutput<typeof ExpenseCreateSchema>`, exported for completeness.
- Category-management raw/parsed types: `RawCategoryCreate`, `ParsedCategoryCreate`, `RawCategoryRename`, `ParsedCategoryRename`, `RawCategoryMergeConfirm`, `ParsedCategoryMergeConfirm`, `RawCategoryDelete`, `ParsedCategoryDelete`.

## Main entry point

### `parseExpenseCreate(raw: RawExpenseCreate): Result<ParsedExpenseCreate, FieldErrors>`

- Runs each field through its dedicated schema via `safeParse` and collects the first issue's message into the matching `FieldErrors` slot.
- For amount, presence is checked by `AmountSchema`; if it passes, `parseAmount` runs and surfaces its error string verbatim on failure (so the existing `parseAmount` test bodies stay authoritative).
- Returns `Result.err(errors)` when any field failed, otherwise `Result.ok({ description, amountCents, date, category })`.
- All fields are evaluated unconditionally — multi-field failures report every problem at once, which the entry form needs to show errors next to each bad input simultaneously.

### `parseNewCategoryName(input: string): Result<string, string>`

- Introduced in Issue 05. Runs the trimmed input through `NewCategoryNameSchema` and, on success, returns the trimmed value *case-preserved*. Lowercasing is deferred to `createCategoryAndExpense` so the UI can echo the user's casing back on the confirmation page.
- On failure returns a single user-facing string suitable to place under the entry form's `category` field via `redirectWithFormErrors(c, PATHS.EXPENSES, { category: err }, values)`.

### `parseTagCsv(input: string): Result<string[], string>`

- Introduced in Issue 06. Splits the raw CSV on `,`, trims each entry, drops empty-after-trim entries, lower-cases the survivors, and de-duplicates silently (preserving first-appearance order). Enforces `length <= tagNameMax` on every kept name.
- Returns `Result.ok([])` for an empty / all-whitespace CSV (zero tags is a valid submission).
- Returns `Result.err(\`Tag names must be at most ${tagNameMax} characters.\`)` when any kept entry exceeds the limit. The POST handler surfaces that string under the `tags` field via `redirectWithFormErrors(c, PATHS.EXPENSES, { tags: err }, values)`.

### Category-management validators (Issue 09)

- `CategoryManagementNameSchema` aliases `NewCategoryNameSchema`, but `parseCategoryManagementName` lowercases the valid trimmed name before returning it.
- `parseCategoryCreate(raw)` validates `{ name }`, trims, requires non-empty, enforces `categoryNameMax`, normalizes to lowercase, and returns `{ name }` or `{ name: message }`.
- `parseCategoryRename(raw)` validates both `id` and normalized `name`, returning both field errors when both are malformed.
- `parseCategoryMergeConfirm(raw)` validates `sourceId` and `targetId`, and rejects equal ids with `targetId: 'Choose two different categories.'`.
- `parseCategoryDelete(raw)` validates a required `id` and returns a trimmed id.

### Tag-management validators (Issue 10)

Tag validators mirror the category-management pattern exactly, with the parallel types `RawTagCreate`, `ParsedTagCreate`, `RawTagRename`, `ParsedTagRename`, `RawTagMergeConfirm`, `ParsedTagMergeConfirm`, `RawTagDelete`, `ParsedTagDelete`.

- `TagManagementNameSchema` — `pipe(string, custom non-empty after trim, custom trim.length <= tagNameMax)`. Separate from `NewCategoryNameSchema` to allow independent evolution.
- `parseTagManagementName` (private) — trims, validates against `TagManagementNameSchema`, returns lowercase on success.
- `parseTagCreate(raw)` validates `{ name }`, trims, requires non-empty, enforces `tagNameMax`, normalizes to lowercase, returns `{ name }` or `{ name: message }`.
- `parseTagRename(raw)` validates both `id` and normalized `name`, returning both field errors when both are malformed.
- `parseTagMergeConfirm(raw)` validates `sourceId` and `targetId`, and rejects equal ids with `targetId: 'Choose two different tags.'`.
- `parseTagDelete(raw)` validates a required `id` and returns a trimmed id.

Note: `parseTagCsv` (Issue 06) is also exported from this module; it serves the entry/edit form tag CSV field and is distinct from the tag management validators above.

## Cross-references

- [money.md](money.md) — `parseAmount` is the underlying numeric validator.
- [et-date.md](et-date.md) — `isValidYmd` enforces calendar dates.
- [form-state.md](form-state.md) — the POST handler hands `FieldErrors` to `redirectWithFormErrors` for round-tripping.
- [../routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — entry-form POST handler that consumes `parseExpenseCreate`.
- [../routes/build-categories.md](../routes/build-categories.md) — category-management POST handlers consuming Issue 09 validators.
- [../routes/build-tags.md](../routes/build-tags.md) — tag-management POST handlers consuming Issue 10 validators.
- [../../tests/expense-validators.spec.md](../../tests/expense-validators.spec.md) — unit coverage.

---

See [source-code.md](../../source-code.md) for the full catalog.
