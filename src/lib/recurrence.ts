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
 * **Quarterly**: returns the next `YYYY-MM-DD` strictly after `after` in the
 * same quarterly cycle as the anchor (i.e. every 3 months from the anchor
 * month). The anchor day is clamped to the target month's last day.
 *
 * **Yearly**: returns the next `YYYY-MM-DD` strictly after `after` that falls
 * on the same month and day as the anchor (in a later year). The anchor day
 * is clamped to the target month's last day (e.g. Feb 29 anchor → Feb 28 in
 * non-leap years; May 31 anchor → May 31 in any year).
 *
 * The 28th-shift rule applies to all recurrences: any anchor day in
 * {29, 30, 31} that exceeds the number of days in the target month is
 * clamped to `min(anchorDay, daysInMonth)`.
 *
 * Inputs are validated to be valid `YYYY-MM-DD` calendar dates; malformed
 * or impossible inputs (e.g. `2025-02-30`) throw a plain `Error` with a
 * helpful message.
 *
 * @param recurrence - Recurrence frequency
 * @param anchorDate - YYYY-MM-DD anchor date
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

  if (recurrence === 'Monthly') {
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

  if (recurrence === 'Quarterly') {
    const [anchorYear, anchorMonth, anchorDay] = parseYmd(anchorDate)
    const [afterYear, afterMonth] = parseYmd(after)

    // Find how many complete 3-month intervals from anchor to after.
    const totalMonthsFromAnchor = (afterYear - anchorYear) * 12 + (afterMonth - anchorMonth)
    const quartersElapsed = Math.floor(totalMonthsFromAnchor / 3)

    // Start from quartersElapsed * 3 months after the anchor month.
    const rawMonth = anchorMonth + quartersElapsed * 3
    let year = anchorYear + Math.floor((rawMonth - 1) / 12)
    let month = (((rawMonth - 1) % 12) + 12) % 12 + 1

    // Two iterations are always sufficient: if the first quarterly slot
    // produces a clamped date <= `after`, the next slot (3 months later)
    // is guaranteed to be strictly after `after`.
    for (let i = 0; i < 2; i++) {
      const dims = daysInMonthFor(year, month)
      const clampedDay = Math.min(anchorDay, dims)
      const candidate = formatYmd(year, month, clampedDay)
      if (candidate > after) {
        return candidate
      }
      month += 3
      if (month > 12) {
        month -= 12
        year += 1
      }
    }

    // Fallback: return the slot we advanced to (unreachable under normal input).
    const dims = daysInMonthFor(year, month)
    return formatYmd(year, month, Math.min(anchorDay, dims))
  }

  if (recurrence !== 'Yearly') {
    throw new Error(`nextOccurrenceAfter: unknown recurrence "${recurrence}"`)
  }

  // Yearly
  const [, anchorMonth, anchorDay] = parseYmd(anchorDate)
  const [afterYear] = parseYmd(after)

  // Try the occurrence in the same year as `after`.
  let year = afterYear
  const dims = daysInMonthFor(year, anchorMonth)
  const clampedDay = Math.min(anchorDay, dims)
  const candidate = formatYmd(year, anchorMonth, clampedDay)

  if (candidate > after) {
    return candidate
  }

  // Advance to next year.
  year += 1
  const dimsNext = daysInMonthFor(year, anchorMonth)
  const clampedDayNext = Math.min(anchorDay, dimsNext)
  return formatYmd(year, anchorMonth, clampedDayNext)
}

/**
 * Compute all occurrence dates that should be generated for a recurring
 * template between the last-known occurrence (exclusive) and today (inclusive).
 *
 * **First-occurrence rule**: occurrences on or before the template's
 * `createdAt` date are never generated, regardless of `lastOccurrence`.
 *
 * **`lastOccurrence` exclusive lower bound**: a date equal to `lastOccurrence`
 * is never returned. When `lastOccurrence` is absent the lower bound is
 * `createdAt`, so the very first generation run collects all occurrences
 * strictly after the creation date and on or before `today`.
 *
 * @param recurrence - Recurrence frequency
 * @param anchorDate - YYYY-MM-DD anchor date for the recurrence rule
 * @param createdAt - YYYY-MM-DD date the template was created (ET-anchored)
 * @param lastOccurrence - YYYY-MM-DD date of the most recent generated
 *   occurrence (exclusive lower bound); omit on first run
 * @param today - YYYY-MM-DD current date (inclusive upper bound, ET-anchored)
 * @returns Ascending list of YYYY-MM-DD occurrence dates to generate
 */
export const occurrencesToGenerate = ({
  recurrence,
  anchorDate,
  createdAt,
  lastOccurrence,
  today,
}: {
  recurrence: 'Monthly' | 'Quarterly' | 'Yearly'
  anchorDate: string
  createdAt: string
  lastOccurrence?: string
  today: string
}): string[] => {
  if (!isValidYmd(anchorDate)) {
    throw new Error(`occurrencesToGenerate: invalid anchorDate "${anchorDate}"`)
  }
  if (!isValidYmd(createdAt)) {
    throw new Error(`occurrencesToGenerate: invalid createdAt "${createdAt}"`)
  }
  if (lastOccurrence !== undefined && !isValidYmd(lastOccurrence)) {
    throw new Error(`occurrencesToGenerate: invalid lastOccurrence "${lastOccurrence}"`)
  }
  if (!isValidYmd(today)) {
    throw new Error(`occurrencesToGenerate: invalid today "${today}"`)
  }

  // The exclusive lower bound: either the last occurrence or the creation date.
  const floor = lastOccurrence ?? createdAt
  let cursor = floor
  const result: string[] = []

  while (true) {
    const next = nextOccurrenceAfter({ recurrence, anchorDate, after: cursor })
    if (next > today) {
      break
    }
    // Apply the first-occurrence rule: never generate on or before the
    // template's creation date.
    if (next > createdAt) {
      result.push(next)
    }
    cursor = next
  }

  return result
}
