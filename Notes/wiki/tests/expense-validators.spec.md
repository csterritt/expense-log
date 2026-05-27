# expense-validators.spec.ts

**Source:** `tests/expense-validators.spec.ts`

## Purpose

Unit coverage for [`src/lib/expense-validators.ts`](../src/lib/expense-validators.md) — added in Issue 04, extended in Issue 05 with `parseNewCategoryName` cases, extended again in Issue 06 with `parseTagCsv` cases, extended in Issue 09 with category-management validators, extended in Issue 10 with tag-management validators, Issue 11 with `parseExpenseListFilters`, Issue 13 with `parseRecurringCreate`, Issue 14 with `parseSummaryQuery` (removed 2026-05-22), Issue 16 with reversed-date-range cases for `parseExpenseListFilters`, Issue 17 re-introduced `parseSummaryQuery` with new dimension, granularity, sort, and tag-AND filter tests. Tag chip-checkbox refactor added `parseTagInputs` (Task 1a) and `parseCategoryInput` tests. Pins the contract that validators normalize/trim successful values and return field-level errors for invalid payloads.

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`, matching `tests/money.spec.ts` and `tests/et-date.spec.ts`.
- Local `expectOk(input, expected)` — asserts `Result.isOk` and that the parsed `amountCents`, trimmed `description`, `date`, and `category` match.
- Local `expectFieldErr(partial, expectedFields)` — overlays `partial` onto a known-valid base, asserts `Result.isErr`, and that each listed field has a non-empty error string.

## Test cases (218 total; was 156 before tag chip-checkbox refactor added `parseTagInputs` and `parseCategoryInput` tests)

### `description`

- `accepts a single char` — `'x'`.
- `accepts exactly descriptionMax characters` — uses the imported `descriptionMax` constant.
- `rejects empty` — `''`.
- `rejects whitespace-only` — `'   '`.
- `rejects descriptionMax + 1 characters`.

### `amount`

- `parses 1234.56 as 123456 cents`.
- `rejects empty`, `rejects zero` (`'0'`), `rejects negatives` (`'-5'`), `rejects more than two decimal places` (`'1.234'`), `rejects non-numeric` (`'abc'`).

### `date`

- `accepts leap day 2024-02-29`.
- `rejects empty`, `rejects 2025-13-40`, `rejects 2024-04-31` (April has 30 days), `rejects malformed shape` (`'2024/02/29'`).

### `category`

- `accepts a non-empty name`, `rejects empty`, `rejects whitespace-only`.

### `parseNewCategoryName` (Issue 05, 7 cases)

- `accepts a single character`, `accepts exactly categoryNameMax characters`, `rejects categoryNameMax + 1 characters`, `rejects empty input`, `rejects whitespace-only input`, `trims surrounding whitespace and returns the trimmed value`, `preserves case in the trimmed value`.

### `parseTagCsv` (Issue 06, 8 cases)

- `returns ok([]) for empty string`.
- `parses a simple two-tag CSV` — `'food, groceries'` → `['food','groceries']`.
- `case-insensitively de-duplicates` — `'Food, food, FOOD'` collapses to `['food']`.
- `trims whitespace per entry` — surrounding spaces stripped before lower-casing.
- `rejects a single tagNameMax + 1 char name`, `rejects when any tag in a longer list exceeds the limit`.
- `returns ok([]) for an all-empty CSV` — `', ,  ,'` → `[]` (zero tags is valid).
- `accepts exactly tagNameMax characters`.

### `multi-field failure`

- `reports errors for every invalid field at once` — submits `{ description: '', amount: '0', date: '2025-13-40', category: '' }` and asserts errors exist for `description`, `amount`, `date`, `category` simultaneously.
- `preserves valid fields passing while invalid ones fail` — only `description` and `amount` invalid; asserts `errors.date` and `errors.category` are `undefined`.

### `parseExpenseListFilters` — reversed date range (Issue 16, 5 new cases)

- `rejects from after to with a date field error` — `{ from: '2024-12-31', to: '2024-01-01' }` → `fieldErrors.date` set.
- `accepts from equal to to (same day)` — `{ from: '2024-06-15', to: '2024-06-15' }` → `fieldErrors` empty, both dates preserved.
- `does not set a date error when only from is present` — single `from` without `to` → `fieldErrors` empty.
- `does not set a date error when only to is present` — single `to` without `from` → `fieldErrors` empty.
- `keeps the earlier bad-format error when from is invalid and from > to would also apply` — invalid `from` format → `fieldErrors.date` set (format error wins); `filters.from` is `undefined`.

### Category management validators (Issue 09, 10 cases)

- `parseCategoryCreate` trims and lowercases valid names, rejects empty names, and rejects `categoryNameMax + 1`.
- `parseCategoryRename` returns id plus normalized name, and reports both `id` and `name` errors when both are invalid.
- `parseCategoryMergeConfirm` returns source/target ids, rejects identical ids under `targetId`, and reports missing source/target ids.
- `parseCategoryDelete` returns a trimmed id and rejects a missing id.

### Tag management validators (Issue 10, 13 cases)

- `parseTagCreate`:
  - `trims and lowercases valid names` — `'  Travel  '` → `{ name: 'travel' }`.
  - `rejects empty names with a field error` — `'   '` → `{ name: message }`.
  - `rejects tagNameMax + 1 characters` — over-limit name → `{ name: message }`.
  - `accepts exactly tagNameMax characters` — exact-limit name → `{ name: 'aaa...' }`.
  - `normalizes mixed-case duplicate targets as the same lowercased name` — `'TRAVEL'` and `'travel'` both normalize to `'travel'`.
- `parseTagRename`:
  - `returns id and normalized name` — `{ id: 'tag-1', name: '  Trips  ' }` → `{ id: 'tag-1', name: 'trips' }`.
  - `reports both id and name errors` — empty id and empty name produce errors on both fields.
  - `rejects tagNameMax + 1 char name` — over-limit name produces a `name` error.
- `parseTagMergeConfirm`:
  - `returns source and target ids` — valid source/target pass through as-is.
  - `rejects matching source and target ids` — identical ids produce `targetId: 'Choose two different tags.'`.
  - `reports missing source and target ids` — both empty produce both field errors.
- `parseTagDelete`:
  - `returns trimmed id` — `'  tag-1  '` → `{ id: 'tag-1' }`.
  - `rejects missing id` — empty id → `{ id: message }`.

### `parseSummaryQuery` (Issue 17, 46 cases)

- **Defaults:** dimension `category`, granularity `month`, `tagIds` empty array, `sort` empty array, `fieldErrors` empty object.
- **Dimension validation:** accepts `time`, `category`, `tag`, `category-tag`; rejects unknown values with `groupBy` field error and falls back to `category`; presence flips `hasFilterParams`.
- **Granularity validation:** accepts `month`, `quarter`, `year`; rejects unknown values with `groupBy` field error and falls back to `month`; presence flips `hasFilterParams`.
- **Date range:** open-from, open-to, both-set, both-absent; rejects invalid dates with `date` field error; rejects `from > to` with `date` field error; accepts `from == to`; presence flips `hasFilterParams`.
- **Tag filter:** collects single `tagId`, accumulates multiple, deduplicates repeated values; presence flips `hasFilterParams`.
- **Sort:** parses single `column:direction`, accumulates multiple, rejects unknown columns/directions with `groupBy` field error; presence flips `hasFilterParams`.

### `parseTagInputs` (Task 1a — pure parser, 62 cases)

- **ULID syntactic validation:** accepts valid Crockford-base32 ULIDs; rejects lowercase, too short, too long, invalid chars (I/L/O/U), empty strings; filters invalid while keeping valid ones.
- **Caps:** rejects more than `TAG_ID_RAW_CAP` tag IDs with `tags` field error; rejects `newTags` longer than `NEW_TAGS_RAW_LENGTH_CAP`; rejects more than `NEW_TAGS_TOKEN_COUNT_CAP` tokens.
- **New tag token validation:** accepts lowercase alphanumeric, hyphens, underscores (1–20 chars); rejects invalid characters, empty tokens, tokens over 20 chars.
- **Existing-tag resolution:** new tag tokens matching an existing tag name (case-insensitive) are resolved to that tag's ID; deduplication applies across both resolved IDs and unresolved tokens.
- **Edge cases:** empty `tagId` and empty `newTags` returns empty arrays with no errors; whitespace-only `newTags` returns empty arrays with no errors; preserves raw `newTags` value in `rawNewTagsPreserved`.

### `parseCategoryInput` (Task 1a — pure parser, 14 cases)

- Validates `categoryId` as ULID (sets `lookupCandidateCategoryId`).
- Validates `newCategory` as lowercase token matching the new-tag regex.
- Resolves to existing category ID when `newCategory` matches an existing category name.
- Returns `resolvedCategoryId`, `newCategory`, or `fieldErrors` as appropriate.

## Cross-references

- [../src/lib/expense-validators.md](../src/lib/expense-validators.md) — module under test.
- [../src/lib/money.md](../src/lib/money.md) — `parseAmount` provides the underlying amount-rejection contract; this spec doesn't re-test those bodies, only that the messages surface unchanged through `parseExpenseCreate`.
- [expense-access.spec.md](expense-access.spec.md) — companion Issue 09/10 repository helper tests.
- [money.spec.md](money.spec.md), [et-date.spec.md](et-date.spec.md) — sibling unit specs covering the lower-level validators.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
