# money.spec.ts

**Source:** `tests/money.spec.ts`

## Purpose

Unit tests for `formatCents` from [src/lib/money.md](../src/lib/money.md). Asserts the exact formatted output for a representative span of cent values.

## Test cases

- `0` → `"0.00"`
- `1` → `"0.01"`
- `99` → `"0.99"`
- `100` → `"1.00"`
- `12345` → `"123.45"`
- `123456` → `"1,234.56"`
- `100000000` → `"1,000,000.00"`

Run with `bun test tests/money.spec.ts` (uses `node:test` + `node:assert`).
