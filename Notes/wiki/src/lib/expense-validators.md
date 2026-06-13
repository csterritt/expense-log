# expense-validators.ts

**Source:** `src/lib/expense-validators.ts`

## Purpose

Validation for expense forms, category-management forms, tag-management forms, and summary query parameters. Introduced in Issue 04 for expense creation, then extended for inline category/tag creation, edit flows, Issue 09 category management, Issue 10 tag management, Issue 11 expense-list filters, Issue 13 recurring templates, Issue 14 summary query (removed 2026-05-22), and Issue 17 updated summary query (re-introduced). Issue 16: `parseExpenseListFilters` gains a `from <= to` ordering check. The module runs fields through dedicated validators, folds messages into a `FieldErrors` record, and returns parsed values on success.

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

- `FieldErrors` — `{ description?, amount?, date?, category?, tags?, name?, id?, sourceId?, targetId?, groupBy?, recurrence?, anchorDate? }`. A missing key means that field passed validation. Issue 09 added the category-management slots; Issue 13 added `recurrence` and `anchorDate`; Issue 17 added `groupBy` for dimension/granularity/sort validation errors.
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

### `parseExpenseListFilters(raw: RawExpenseListFilters): ExpenseListFilterResult` (Issue 11, updated Issue 16)

- Accepts optional `description`, `from`, `to`, `categoryId`, `tagId`, `tagMode` query-string fields.
- `hasFilterParams` is `true` when at least one key is present, so the route layer can distinguish a fresh first load from an explicit filter submission.
- `from`/`to`: each independently optional; validated as `YYYY-MM-DD` via `isValidYmd`. Issue 16 adds: when **both** are present and valid, `from > to` sets `fieldErrors.date = 'From date must be on or before To date.'` (only if no earlier date-format error is already present).
- Returns `{ hasFilterParams, filters: ParsedExpenseListFilters, fieldErrors: FieldErrors }`; does not short-circuit on errors (route decides how to handle them).

### `parseTagInputs(raw: RawTagInputs, existingTags: ExistingTag[]): ParsedTagInputs` (Tag chip-checkbox refactor)

Replaces the old `parseTagCsv` approach for the entry/edit forms. Handles both selected existing tag IDs (from native checkboxes) and new tag names (from the `newTags` text input).

- **ULID validation:** `tagId` values are filtered through Crockford-base32 ULID regex (`/^[0-9A-HJKMNP-TV-Z]{26}$/`). Invalid IDs are silently dropped; duplicates are deduplicated.
- **Caps:** `TAG_ID_RAW_CAP` (64) limits raw tag ID count; `NEW_TAGS_RAW_LENGTH_CAP` (500) limits the raw new-tags string length; `NEW_TAGS_TOKEN_COUNT_CAP` (32) limits the number of parsed new-tag tokens.
- **New tag parsing:** splits `newTags` on comma/whitespace, trims, lowercases, deduplicates. Each token must match `/^[a-z0-9_-]{1,20}$/`.
- **Existing-tag resolution:** new tag tokens that match an existing tag name (case-insensitive) are converted to that tag's ID instead of being treated as new.
- **Returns:** `{ lookupCandidateTagIds, tagIds, newTags, rawNewTagsPreserved, fieldErrors }`.

### `parseCategoryInput(raw: RawCategoryInput, existingCategory: ExistingCategory | null): ParsedCategoryInput`

- Validates `categoryId` as a ULID (sets `lookupCandidateCategoryId`).
- Validates `newCategory` as a lowercase token matching the new-tag regex (`NEW_TAG_TOKEN_REGEX`).
- If `newCategory` matches an existing category name (case-insensitive), resolves to that category's ID.
- Returns `{ lookupCandidateCategoryId, resolvedCategoryId, newCategory, fieldErrors }`.

### Shared query-string helpers (Issue 18)

- **`parseFilterTagIds(raw)`** — shared by `parseExpenseListFilters` and `parseSummaryQuery`. Silently drops non-ULID values and truncates to `TAG_ID_RAW_CAP` without producing a field error (page still renders).
- **`parseDateRange(rawFrom, rawTo)`** — shared by both parsers. Invalid dates are silently treated as absent. Only `from > to` produces an error string. Does not mutate the caller's errors object.

### Module-level constants (Issue 18)

- `TAG_ID_RAW_CAP = 64` — maximum raw `tagId` count on mutation forms; exceeded count is a recoverable validation error.
- `NEW_TAGS_RAW_LENGTH_CAP = 500` — maximum raw `newTags` text length; exceeded length is a recoverable validation error.
- `NEW_TAGS_TOKEN_COUNT_CAP = 32` — maximum post-split `newTags` token count; exceeded count is a recoverable validation error.
- `ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/` — Crockford-base32 ULID syntax check. Lowercase input is rejected as invalid format (not silently uppercased).
- `NEW_TAG_TOKEN_REGEX = /^[a-z0-9_-]{1,20}$/` — valid new-tag token pattern.

### `parseSummaryQuery(raw: RawSummaryQuery): SummaryQueryResult` (Issue 17, updated Issue 18)

Re-introduced in Issue 17 with a new signature reflecting the updated summary design. Updated in Issue 18 with dimension-aware sort allow-list and improved date/tag handling.

- **Dimensions:** `time`, `category`, `tag`, `category-tag`. Defaults to `category`. Unknown values report a `groupBy` field error and fall back to `category`.
- **Granularities:** `month`, `quarter`, `year`. Defaults to `month`. Always present in the UI selector; unknown values report a `groupBy` field error and fall back to `month`.
- **Date range:** `from` and `to` are independently optional. Both are validated with `isValidYmd`. Invalid dates (wrong shape or impossible calendar dates like `2026-02-31`) are silently dropped — no error produced. Only `from > to` (both valid) produces a `fieldErrors.date` error. Issue 18: non-`YYYY-MM-DD` and impossible-calendar dates are treated as absent.
- **Tag filter:** `tagId` can be a single string or array; deduplicated preserving first-appearance order. Tag filtering is **AND-semantic**: only expenses carrying **all** listed tags are included. Issue 18: syntactically invalid `tagId` values are silently dropped and raw count is truncated to `TAG_ID_RAW_CAP` without error (page still renders).
- **Sort (Issue 18 dimension-aware allow-list):** `sort` can be a single string or array of `column:direction` strings. Valid columns vary by dimension — the allow-list is built from `VALID_SORT_COLUMNS_ALWAYS` (`timePeriod`, `count`, `total`) plus `DIMENSION_EXTRA_SORT_COLUMNS` per dimension (`category` adds `category`; `tag` adds `tag`; `category-tag` adds `category` and `tag`). Invalid (out-of-dimension or unknown) sort columns and invalid directions are silently ignored (no error), falling back to the default sort.
- `hasFilterParams` is `true` when any key is present, distinguishing first load from explicit filter submission.
- Returns `{ hasFilterParams, dimension, granularity, from?, to?, tagIds: string[], sort: SummarySortEntry[], fieldErrors }`.

## Cross-references

- [money.md](money.md) — `parseAmount` is the underlying numeric validator.
- [et-date.md](et-date.md) — `isValidYmd` enforces calendar dates.
- [form-state.md](form-state.md) — the POST handler hands `FieldErrors` to `redirectWithFormErrors` for round-tripping.
- [../routes/expenses/expense-post-handler.md](../routes/expenses/expense-post-handler.md) — entry-form POST handler consuming `parseTagInputs`.
- [../routes/expenses/build-edit-expense.md](../routes/expenses/build-edit-expense.md) — edit-form POST handler consuming `parseTagInputs`.
- [../routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — entry-form POST handler that consumes `parseExpenseCreate`.
- [../routes/build-categories.md](../routes/build-categories.md) — category-management POST handlers consuming Issue 09 validators.
- [../routes/build-tags.md](../routes/build-tags.md) — tag-management POST handlers consuming Issue 10 validators.
- [../routes/build-summary.md](../routes/build-summary.md) — summary page route that consumes `parseSummaryQuery`.
- [../routes/recurring/build-create-recurring.md](../routes/recurring/build-create-recurring.md) — recurring create POST handler consuming `parseTagInputs`.
- [../routes/recurring/build-edit-recurring.md](../routes/recurring/build-edit-recurring.md) — recurring edit POST handler consuming `parseTagInputs`.
- [db/confirm-helpers.md](db/confirm-helpers.md) — `resolveConfirmTagsAndCategory` consumes `parseTagInputs`.
- [../../tests/expense-validators.spec.md](../../tests/expense-validators.spec.md) — unit coverage.

---

See [source-code.md](../../source-code.md) for the full catalog.
