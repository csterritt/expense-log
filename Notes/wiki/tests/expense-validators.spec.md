# expense-validators.spec.ts

**Source:** `tests/expense-validators.spec.ts`

## Purpose

Unit coverage for [`src/lib/expense-validators.ts`](../src/lib/expense-validators.md) — added in Issue 04. Pins the contract that `parseExpenseCreate` accepts a representative valid input per field, rejects every failure case enumerated in the issue, and reports **every** invalid field at once on multi-field failures (not just the first).

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`, matching `tests/money.spec.ts` and `tests/et-date.spec.ts`.
- Local `expectOk(input, expected)` — asserts `Result.isOk` and that the parsed `amountCents`, trimmed `description`, `date`, and `categoryId` match.
- Local `expectFieldErr(partial, expectedFields)` — overlays `partial` onto a known-valid base, asserts `Result.isErr`, and that each listed field has a non-empty error string.

## Test cases (21 total)

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

- `accepts a non-empty id`, `rejects empty`, `rejects whitespace-only`.

### `multi-field failure`

- `reports errors for every invalid field at once` — submits `{ description: '', amount: '0', date: '2025-13-40', categoryId: '' }` and asserts errors exist for `description`, `amount`, `date`, `category` simultaneously.
- `preserves valid fields passing while invalid ones fail` — only `description` and `amount` invalid; asserts `errors.date` and `errors.category` are `undefined`.

## Cross-references

- [../src/lib/expense-validators.md](../src/lib/expense-validators.md) — module under test.
- [../src/lib/money.md](../src/lib/money.md) — `parseAmount` provides the underlying amount-rejection contract; this spec doesn't re-test those bodies, only that the messages surface unchanged through `parseExpenseCreate`.
- [money.spec.md](money.spec.md), [et-date.spec.md](et-date.spec.md) — sibling unit specs covering the lower-level validators.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
