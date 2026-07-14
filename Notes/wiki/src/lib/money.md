# money.ts

**Source:** `src/lib/money.ts`

## Purpose

Money formatting and parsing utilities. Issue 02 introduced `formatCents`; Issue 03 added `parseAmount`.

## Exports

### `formatCents(cents: number): string`

Formats an integer cent amount as a US-English dollar string with comma thousands separators and exactly two decimal places.

- `0` → `"0.00"`
- `1` → `"0.01"`
- `100` → `"1.00"`
- `123456` → `"1,234.56"`
- `100000000` → `"1,000,000.00"`

Implemented with `Intl.NumberFormat('en-US')` for the integer part and a manual two-digit pad for the cents fraction; this avoids floating-point rounding when scaling cents to dollars.

### `formatCentsPlain(cents: number): string`

Added in Issue 08. Like `formatCents` but emits a plain decimal with no comma grouping — suitable for round-tripping through the entry / edit form's `amount` `<input>` (which `parseAmount` then re-validates).

- `0` → `"0.00"`
- `100` → `"1.00"`
- `123456` → `"1234.56"`

Used by the edit page GET to seed `expense-form-amount`'s `value` attribute from the loaded `amountCents`.

### `parseAmount(input: string): Result<number, string>`

Parses a user-entered positive money amount into integer cents.

- Trims whitespace.
- Accepts forms like `1234`, `1234.56`, `1,234.56`, `.50`, `1,000,000.00`.
- Validates with two regexes: `/^\d*\.?\d+$/` for the no-comma case and `/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/` for the comma case.
- Rejects empty input, zero (`0`, `0.00`), negatives, more than 2 decimal places, malformed comma placement (e.g. `1,23.45`, `,123`, `12,3456`), and non-numeric input.
- Returns `Result.ok(cents)` on success, `Result.err(message)` on failure (no exceptions).

## Cross-references

- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — uses `formatCents` for the amount column and `parseAmount` for the entry-form POST handler.
- [tests/money.spec.md](../../tests/money.spec.md) — unit coverage of both `formatCents` and `parseAmount`.

---

See [source-code.md](../../source-code.md) for the full catalog.
