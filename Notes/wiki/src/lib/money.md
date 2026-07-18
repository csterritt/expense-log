# src/lib/money.ts

Money formatting and parsing utilities. All amounts stored as integer cents.

## Functions

### formatCents(cents): string

Formats integer cents as US-English dollar string with comma separators and 2 decimal places. Examples: `0` → `"0.00"`, `100` → `"1.00"`, `123456` → `"1,234.56"`. Handles negative amounts.

### formatCentsPlain(cents): string

Formats integer cents as plain decimal string (no grouping separators). Examples: `0` → `"0.00"`, `123456` → `"1234.56"`. Used for form input values that `parseAmount` can round-trip.

### parseAmount(input): Result\<number, string\>

Parses user-entered positive money amount into integer cents. Accepts: `1234.56`, `1,234.56`, `1234`, `.50`. Rejects: empty, zero, negative, >2 decimal places, malformed commas, non-numeric. Returns `Result.ok(cents)` or `Result.err(message)`.

## Regex patterns

- `NO_COMMA_RE` — `/^\d*\.?\d+$/` (no commas)
- `WITH_COMMA_RE` — `/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/` (US-style grouping)

## Dependencies

- `true-myth/result` — Result type
