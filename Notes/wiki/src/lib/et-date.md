# et-date.ts

**Source:** `src/lib/et-date.ts`

## Purpose

`America/New_York` date helpers used by the expense feature for the default date filter range, validating `YYYY-MM-DD` inputs, and producing summary time-period labels. Built on `Intl.DateTimeFormat` so it works on Cloudflare Workers without additional dependencies. Issue 18 adds chronological sort keys (`monthChronKeyEt`, `quarterChronKeyEt`) and year-bearing labels (`monthLabelEt`, `quarterLabelEt`) for cross-year sorting.

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

### `monthLabelEt(ymd: string): string` (Issue 18)

Returns the `Mmm YYYY` month label for a `YYYY-MM-DD` ET-anchored date string (e.g. `'Jan 2026'`). Used by `summary-access.ts` for rendering chronological month rows.

### `monthChronKeyEt(ymd: string): number` (Issue 18)

Returns the numeric chronological key `year * 100 + monthIndex` (0-based) for a `YYYY-MM-DD` date. Used to sort month rows across year boundaries (e.g. `Dec 2025` → `202511`, `Jan 2026` → `202600`).

### `quarterKeyEt(ymd: string): string` (Issue 17)

Returns the calendar-quarter label `Mmm-Mmm` for a `YYYY-MM-DD` ET-anchored date string (one of `'Jan-Mar'`, `'Apr-Jun'`, `'Jul-Sep'`, `'Oct-Dec'`). Rejects invalid dates.

### `quarterLabelEt(ymd: string): string` (Issue 18)

Returns the `Mmm-Mmm YYYY` quarter label for a `YYYY-MM-DD` ET-anchored date string (e.g. `'Jan-Mar 2026'`). Used by `summary-access.ts` for rendering chronological quarter rows.

### `quarterChronKeyEt(ymd: string): number` (Issue 18)

Returns the numeric chronological key `year * 10 + quarterIndex` (0-based) for a `YYYY-MM-DD` date. Used to sort quarter rows across year boundaries (e.g. `Oct-Dec 2025` → `20253`, `Jan-Mar 2026` → `20260`).

### `yearKeyEt(ymd: string): string` (Issue 17)

Returns the four-digit year string for a `YYYY-MM-DD` ET-anchored date string (e.g. `'2026'`). Rejects invalid dates.

## Cross-references

- [routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — calls `defaultRangeEt()` to build the listing window.
- [db/summary-access.md](db/summary-access.md) — uses all key/label helpers to format `timePeriod` labels and chronological sort keys.
- [tests/et-date.spec.md](../../tests/et-date.spec.md) — unit coverage including DST boundaries, leap-day edges, and the key/label helpers.

---

See [source-code.md](../../source-code.md) for the full catalog.
