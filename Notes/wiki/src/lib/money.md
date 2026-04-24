# money.ts

**Source:** `src/lib/money.ts`

## Purpose

Money formatting utilities. Issue 02 introduced `formatCents` for rendering integer cent amounts in the expense list table. `parseAmount` is intentionally left for a later slice.

## Exports

### `formatCents(cents: number): string`

Formats an integer cent amount as a US-English dollar string with comma thousands separators and exactly two decimal places.

- `0` → `"0.00"`
- `1` → `"0.01"`
- `100` → `"1.00"`
- `123456` → `"1,234.56"`
- `100000000` → `"1,000,000.00"`

Implemented with `Intl.NumberFormat('en-US')` for the integer part and a manual two-digit pad for the cents fraction; this avoids floating-point rounding when scaling cents to dollars.

## Cross-references

- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — uses `formatCents` for the amount column.
- [tests/money.spec.md](../../tests/money.spec.md) — unit coverage.

---

See [source-code.md](../../source-code.md) for the full catalog.
