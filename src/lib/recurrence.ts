/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Recurrence date computation utilities.
 *
 * HTTP-agnostic and date-library-free. Uses only plain calendar arithmetic
 * on YYYY-MM-DD strings. Do NOT import drizzle, Hono, or anything from
 * `src/lib/db/`.
 *
 * @module lib/recurrence
 */
import { isValidYmd } from './et-date'

/**
 * Return the number of days in `month` (1-based) of `year`.
 * Uses the UTC trick: Date(year, month, 0) gives the last day of month-1.
 */
const daysInMonthFor = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

const parseYmd = (s: string): [number, number, number] => {
  const parts = s.split('-')
  return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)]
}

const formatYmd = (year: number, month: number, day: number): string =>
  `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

/**
 * Return the next occurrence date strictly after `after` for the given
 * recurrence rule and anchor date.
 *
 * **Monthly**: returns the next `YYYY-MM-DD` strictly after `after` whose
 * day-of-month equals the anchor day. If the anchor day exceeds the last
 * day of the target month the day is clamped to that last day (the
 * "28th-shift rule": anchor 29/30/31 in a non-leap February → Feb 28;
 * anchor 31 in April → Apr 30; etc.).
 *
 * **Quarterly / Yearly**: throws `Error('Not yet implemented — see Issue 14')`.
 *
 * Inputs are validated to be valid `YYYY-MM-DD` calendar dates; malformed
 * or impossible inputs (e.g. `2025-02-30`) throw a plain `Error` with a
 * helpful message.
 *
 * @param recurrence - Recurrence frequency
 * @param anchorDate - YYYY-MM-DD anchor date (only its day-of-month is used
 *   for Monthly recurrence)
 * @param after - YYYY-MM-DD date; the result is strictly after this value
 * @returns YYYY-MM-DD string of the next occurrence
 */
export const nextOccurrenceAfter = ({
  recurrence,
  anchorDate,
  after,
}: {
  recurrence: 'Monthly' | 'Quarterly' | 'Yearly'
  anchorDate: string
  after: string
}): string => {
  if (!isValidYmd(anchorDate)) {
    throw new Error(
      `nextOccurrenceAfter: invalid anchorDate "${anchorDate}" (expected YYYY-MM-DD)`,
    )
  }
  if (!isValidYmd(after)) {
    throw new Error(`nextOccurrenceAfter: invalid after "${after}" (expected YYYY-MM-DD)`)
  }
  if (recurrence === 'Quarterly' || recurrence === 'Yearly') {
    throw new Error('Not yet implemented — see Issue 14')
  }

  const [, , anchorDay] = parseYmd(anchorDate)
  const [afterYear, afterMonth] = parseYmd(after)

  // Try the occurrence in the same month as `after`.
  let year = afterYear
  let month = afterMonth
  const dims = daysInMonthFor(year, month)
  const clampedDay = Math.min(anchorDay, dims)
  const candidate = formatYmd(year, month, clampedDay)

  if (candidate > after) {
    return candidate
  }

  // Occurrence in the same month is not strictly after `after`; advance
  // to the next month.
  month += 1
  if (month > 12) {
    month = 1
    year += 1
  }
  const dimsNext = daysInMonthFor(year, month)
  const clampedDayNext = Math.min(anchorDay, dimsNext)
  return formatYmd(year, month, clampedDayNext)
}
