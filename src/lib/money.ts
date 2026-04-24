/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Money formatting utilities.
 * @module lib/money
 */

const FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
})

/**
 * Format an integer amount in cents as a US-English dollar string with
 * comma thousands separators and exactly two decimal places.
 *
 * Examples: 0 -> "0.00", 100 -> "1.00", 123456 -> "1,234.56".
 *
 * @param cents - Integer amount in cents (may be negative)
 * @returns Formatted string, e.g. "1,234.56"
 */
export const formatCents = (cents: number): string => {
  const whole = Math.trunc(cents / 100)
  const fraction = Math.abs(cents % 100)
  const sign = cents < 0 && whole === 0 ? '-' : ''
  const wholeStr = FORMATTER.format(whole).split('.')[0]
  const fracStr = fraction.toString().padStart(2, '0')
  return `${sign}${wholeStr}.${fracStr}`
}
