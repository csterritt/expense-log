/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * America/New_York date utilities. All dates are `YYYY-MM-DD` strings.
 * Uses `Intl.DateTimeFormat` so this works on Cloudflare Workers without
 * extra deps.
 * @module lib/et-date
 */

const ET_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Current date in `America/New_York` formatted as `YYYY-MM-DD`.
 * Accepts an optional reference `Date` for testability.
 */
export const todayEt = (reference?: Date): string => {
  const d = reference ?? new Date()
  // en-CA yields YYYY-MM-DD
  return ET_FORMATTER.format(d)
}

/**
 * Default date range for the expense list view.
 *
 * Returns `{ from, to }` where `to` is `todayEt(reference)` and `from` is
 * the first of the month two months before that ET date.
 */
export const defaultRangeEt = (reference?: Date): { from: string; to: string } => {
  const to = todayEt(reference)
  const [yStr, mStr] = to.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10) // 1-12
  // Go back two months
  let fromMonth = month - 2
  let fromYear = year
  while (fromMonth < 1) {
    fromMonth += 12
    fromYear -= 1
  }
  const from = `${fromYear.toString().padStart(4, '0')}-${fromMonth.toString().padStart(2, '0')}-01`
  return { from, to }
}

/**
 * Return true iff `s` is a valid calendar date formatted as `YYYY-MM-DD`.
 */
export const isValidYmd = (s: string): boolean => {
  const m = YMD_RE.exec(s)
  if (!m) {
    return false
  }
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (month < 1 || month > 12) {
    return false
  }
  if (day < 1 || day > 31) {
    return false
  }
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}
