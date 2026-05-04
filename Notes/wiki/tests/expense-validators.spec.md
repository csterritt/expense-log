# expense-validators.spec.ts

**Source:** `tests/expense-validators.spec.ts`

## Purpose

Unit coverage for [`src/lib/expense-validators.ts`](../src/lib/expense-validators.md) — added in Issue 04, extended in Issue 05 with `parseNewCategoryName` cases, extended again in Issue 06 with `parseTagCsv` cases, and extended in Issue 09 with category-management validators. Pins the contract that validators normalize/trim successful values and return field-level errors for invalid payloads.

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`, matching `tests/money.spec.ts` and `tests/et-date.spec.ts`.
- Local `expectOk(input, expected)` — asserts `Result.isOk` and that the parsed `amountCents`, trimmed `description`, `date`, and `category` match.
- Local `expectFieldErr(partial, expectedFields)` — overlays `partial` onto a known-valid base, asserts `Result.isErr`, and that each listed field has a non-empty error string.

## Test cases (46 total)

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

### Category management validators (Issue 09, 10 cases)

- `parseCategoryCreate` trims and lowercases valid names, rejects empty names, and rejects `categoryNameMax + 1`.
- `parseCategoryRename` returns id plus normalized name, and reports both `id` and `name` errors when both are invalid.
- `parseCategoryMergeConfirm` returns source/target ids, rejects identical ids under `targetId`, and reports missing source/target ids.
- `parseCategoryDelete` returns a trimmed id and rejects a missing id.

## Cross-references

- [../src/lib/expense-validators.md](../src/lib/expense-validators.md) — module under test.
- [../src/lib/money.md](../src/lib/money.md) — `parseAmount` provides the underlying amount-rejection contract; this spec doesn't re-test those bodies, only that the messages surface unchanged through `parseExpenseCreate`.
- [expense-access.spec.md](expense-access.spec.md) — companion Issue 09 repository helper tests.
- [money.spec.md](money.spec.md), [et-date.spec.md](et-date.spec.md) — sibling unit specs covering the lower-level validators.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
