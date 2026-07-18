# src/lib/expense-validators.ts

Valibot-based validators and parsers for expense forms, filters, summary queries, recurring templates, tag inputs, and category names.

## Key types

- `FieldErrors` — per-field error message map (description, amount, date, category, tags, name, id, sourceId, targetId, groupBy, recurrence, anchorDate)
- `ParsedExpenseCreate` — validated expense: description, amountCents, date, category
- `RawExpenseCreate` — raw string inputs from entry form
- `RecurringFormValues` / `ParsedRecurringCreate` — recurring template form types
- `ExpenseListFilterResult` — parsed filter params with `hasFilterParams` flag

## Key functions

### parseExpenseCreate(values): Result\<ParsedExpenseCreate, FieldErrors\>

Validates expense entry form: description (non-empty, ≤200 chars), amount (via `parseAmount`), date (valid YYYY-MM-DD), category (non-empty). Returns parsed values with amount in cents or field errors.

### parseRecurringCreate(values): Result\<ParsedRecurringCreate, FieldErrors\>

Validates recurring template form: same fields as expense plus `recurrence` (Monthly/Quarterly/Yearly) and `anchorDate` (valid YYYY-MM-DD).

### parseExpenseListFilters(raw): ExpenseListFilterResult

Parses filter bar params: description (trimmed), from/to date range, categoryId, tagId array, tagMode (or/and). Returns `hasFilterParams` to distinguish fresh load from explicit filter submission.

### parseNewCategoryName(raw): Result\<string, string\>

Validates a new category name: trimmed, non-empty, ≤20 chars.

### parseTagInputs(rawNewTags, existingTagIds): Result\<{ tagIds, newTags }, string\>

Parses tag input: validates existing tag IDs (ULID format), parses new tag names (comma/space separated, ≤20 chars each, ≤10 tokens). Returns combined tagIds and newTags array.

### parseCategoryInput(raw): Result\<string, string\>

Validates category input for inline creation flow.

### parseSummaryQuery(raw): Result\<SummaryQuery, FieldErrors\>

Validates summary page query params: groupBy dimension, granularity, date range, tag filter, sort order.

## Constants

- `descriptionMax` — 200 (prod) / 202 (dev)
- `categoryNameMax` — 20 (prod) / 22 (dev)
- `tagNameMax` — 20 (prod) / 22 (dev)
- `VALID_RECURRENCES` — `['Monthly', 'Quarterly', 'Yearly']`
- `TAG_ID_RAW_CAP`, `NEW_TAGS_RAW_LENGTH_CAP`, `NEW_TAGS_TOKEN_COUNT_CAP` — limits for tag input parsing
- `ULID_REGEX`, `NEW_TAG_TOKEN_REGEX` — patterns for tag parsing

## Schemas

- `DescriptionSchema`, `DateSchema`, `CategorySchema`, `AmountSchema` — reusable Valibot pipe schemas
- `RecurrenceSchema`, `AnchorDateSchema` — recurring-specific schemas

## Dependencies

- `valibot` — schema validation
- `true-myth/result` — Result type
- `./et-date` — `isValidYmd`
- `./money` — `parseAmount`
