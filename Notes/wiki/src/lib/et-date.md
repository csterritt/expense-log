# src/lib/et-date.ts

America/New_York date utilities. All dates are `YYYY-MM-DD` strings. Uses `Intl.DateTimeFormat` for Cloudflare Workers compatibility.

## Functions

### todayEt(reference?): string

Current date in ET timezone as `YYYY-MM-DD`. Accepts optional `Date` for testability.

### defaultRangeEt(reference?): { from, to }

Returns date range for expense list default view: `to` is today, `from` is the first of the month two months before today (in ET).

### isValidYmd(s): boolean

Validates a `YYYY-MM-DD` string is a real calendar date (checks month 1-12, day 1-31, and actual date validity via UTC Date construction).

### monthKeyEt(ymd): string

Returns 3-letter month abbreviation (e.g. `'Jan'`).

### monthLabelEt(ymd): string

Returns `Mmm YYYY` label (e.g. `'Jan 2026'`).

### monthChronKeyEt(ymd): number

Returns `year * 100 + (month - 1)` for chronological sorting across year boundaries.

### quarterKeyEt(ymd): string

Returns quarter label (e.g. `'Jan-Mar'`, `'Apr-Jun'`, `'Jul-Sep'`, `'Oct-Dec'`).

### quarterLabelEt(ymd): string

Returns `Mmm-Mmm YYYY` quarter label (e.g. `'Jan-Mar 2026'`).

### quarterChronKeyEt(ymd): number

Returns `year * 10 + (quarter - 1)` for chronological sorting.

### yearKeyEt(ymd): string

Returns 4-digit year string (e.g. `'2026'`).

## Constants

- `ET_FORMATTER` — `Intl.DateTimeFormat` with `America/New_York` timezone, `en-CA` locale (yields YYYY-MM-DD)
- `MONTH_NAMES` — Jan-Dec abbreviations
- `QUARTER_LABELS` — Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
