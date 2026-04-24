# et-date.spec.ts

**Source:** `tests/et-date.spec.ts`

## Purpose

Unit tests for [src/lib/et-date.md](../src/lib/et-date.md). All tests inject fixed reference `Date`s — none read the system clock.

## Test cases

### `todayEt`

- 2024-03-10 EST→EDT spring-forward boundary, both pre- and post-jump UTC instants resolve to `2024-03-10`.
- 2024-11-03 EDT→EST fall-back boundary, both sides resolve to `2024-11-03`.
- UTC instants near midnight that fall on the previous ET day (e.g. `2024-07-01T03:00:00Z` → `2024-06-30`).

### `defaultRangeEt`

- Mid-January reference → `from = '2023-11-01'`, `to = '<that date>'`.
- Mid-February reference → wraps year to `'2023-12-01'`.
- March 1 reference → `from = '2024-01-01'`.
- December 15 reference → `from = '2024-10-01'`.

### `isValidYmd`

- `2024-02-29` true, `2023-02-29` false.
- `2024-13-01` false, `2024-04-31` false.
- Empty string, missing dashes, trailing garbage, short year, single-digit month all false.
- Ordinary dates (`2024-01-01`, `1999-12-31`) true.
