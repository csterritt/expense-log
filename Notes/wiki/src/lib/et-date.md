# et-date.ts

**Source:** `src/lib/et-date.ts`

## Purpose

`America/New_York` date helpers used by the expense feature for the default date filter range, validating `YYYY-MM-DD` inputs, and producing summary time-period labels. Built on `Intl.DateTimeFormat` so it works on Cloudflare Workers without additional dependencies.

## Exports

### `todayEt(reference?: Date): string`

Returns the current ET date as `YYYY-MM-DD`. Accepts an optional reference `Date` for testability (matches the injection style used by `time-access.ts`).

### `defaultRangeEt(reference?: Date): { from: string; to: string }`

Returns the default date range for the expenses list:

- `to` = `todayEt(reference)`
- `from` = first of the month two months before `to` (e.g. mid-January → `YYYY-11-01` of the previous year; March 1 → January 1).

### `isValidYmd(s: string): boolean`

Returns `true` iff `s` is a real calendar date formatted as `YYYY-MM-DD`. Rejects month/day overflow, invalid leap days, and malformed shapes.

### `monthKeyEt(ymd: string): string` (Issue 17)

Returns the capitalized three-letter month abbreviation for a `YYYY-MM-DD` ET-anchored date string (e.g. `'Jan'`). Rejects invalid dates via the same `isValidYmd` guard.

### `quarterKeyEt(ymd: string): string` (Issue 17)

Returns the calendar-quarter label `Mmm-Mmm` for a `YYYY-MM-DD` ET-anchored date string (one of `'Jan-Mar'`, `'Apr-Jun'`, `'Jul-Sep'`, `'Oct-Dec'`). Rejects invalid dates.

### `yearKeyEt(ymd: string): string` (Issue 17)

Returns the four-digit year string for a `YYYY-MM-DD` ET-anchored date string (e.g. `'2026'`). Rejects invalid dates.

## Cross-references

- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — calls `defaultRangeEt()` to build the listing window.
- [db/summary-access.md](db/summary-access.md) — uses all three key helpers to format `timePeriod` labels.
- [tests/et-date.spec.md](../../tests/et-date.spec.md) — unit coverage including DST boundaries, leap-day edges, and the three key helpers.

---

See [source-code.md](../../source-code.md) for the full catalog.
