# money.spec.ts

**Source:** `tests/money.spec.ts`

## Purpose

Unit tests for [src/lib/money.md](../src/lib/money.md). Two `describe` blocks cover `formatCents` (Issue 02) and `parseAmount` (Issue 03).

## `formatCents` cases

- `0` → `"0.00"`
- `1` → `"0.01"`
- `99` → `"0.99"`
- `100` → `"1.00"`
- `12345` → `"123.45"`
- `123456` → `"1,234.56"`
- `100000000` → `"1,000,000.00"`

## `parseAmount` cases

Local `expectOk(input, cents)` and `expectErr(input)` helpers assert the `Result` branch and that the error string is non-empty (without locking down exact wording).

- Accepts: `1234.56` → 123456, `1,234.56` → 123456, `1234` → 123400, `.50` → 50, `0.5` → 50, surrounding whitespace, `1,000,000.00` → 100000000.
- Rejects malformed comma placement: `1,23.45`, `,123`, `12,3456`, `1,2345`, `1,,234`.
- Rejects zero: `0`, `0.00`, `0.0`, `.00`.
- Rejects negatives: `-1`, `-1.50`, `-0.01`.
- Rejects more than two decimals: `1.234`, `0.001`, `1,234.567`.
- Rejects non-numeric: `abc`, `12abc`, `$1.00`, `1.2.3`.
- Rejects empty: `''`, `'   '`.

Run with `bun test tests/money.spec.ts` (uses `node:test` + `node:assert`). All 20 tests pass.
