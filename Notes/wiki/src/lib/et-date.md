# et-date.ts

**Source:** `src/lib/et-date.ts`

## Purpose

`America/New_York` date helpers used by the expense feature for the default date filter range and for validating `YYYY-MM-DD` inputs. Built on `Intl.DateTimeFormat` so it works on Cloudflare Workers without additional dependencies.

## Exports

### `todayEt(reference?: Date): string`

Returns the current ET date as `YYYY-MM-DD`. Accepts an optional reference `Date` for testability (matches the injection style used by `time-access.ts`).

### `defaultRangeEt(reference?: Date): { from: string; to: string }`

Returns the default date range for the expenses list:

- `to` = `todayEt(reference)`
- `from` = first of the month two months before `to` (e.g. mid-January → `YYYY-11-01` of the previous year; March 1 → January 1).

### `isValidYmd(s: string): boolean`

Returns `true` iff `s` is a real calendar date formatted as `YYYY-MM-DD`. Rejects month/day overflow, invalid leap days, and malformed shapes.

## Cross-references

- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — calls `defaultRangeEt()` to build the listing window.
- [tests/et-date.spec.md](../../tests/et-date.spec.md) — unit coverage including DST boundaries and leap-day edges.

---

See [source-code.md](../../source-code.md) for the full catalog.
