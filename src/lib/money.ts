/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Money formatting utilities.
 * @module lib/money
 */
import Result from 'true-myth/result'

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

// Matches a positive decimal with optional US-style thousands grouping. Either:
//   - No commas: digits with optional fractional part (e.g. `1234`, `.50`, `12.34`)
//   - With commas: leading 1-3 digit group, then `,ddd` groups, optional fractional part
const NO_COMMA_RE = /^\d*\.?\d+$/
const WITH_COMMA_RE = /^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/

/**
 * Parse a user-entered positive money amount into integer cents.
 *
 * Accepts forms like `1234.56`, `1,234.56`, `1234`, `.50`, with surrounding
 * whitespace tolerated. Rejects empty input, zero, negatives, more than two
 * fractional digits, malformed comma placement, and non-numeric input.
 *
 * @param input - Raw user-entered amount
 * @returns `Result.ok(cents)` on success, `Result.err(message)` on failure
 */
export const parseAmount = (input: string): Result<number, string> => {
  if (typeof input !== 'string') {
    return Result.err('Amount must be a string')
  }
  const trimmed = input.trim()
  if (trimmed === '') {
    return Result.err('Amount is required')
  }
  if (trimmed.startsWith('-')) {
    return Result.err('Amount must be positive')
  }
  const hasComma = trimmed.includes(',')
  const matches = hasComma ? WITH_COMMA_RE.test(trimmed) : NO_COMMA_RE.test(trimmed)
  if (!matches) {
    return Result.err('Amount is not a valid number')
  }
  const stripped = hasComma ? trimmed.replace(/,/g, '') : trimmed
  const dotIdx = stripped.indexOf('.')
  const wholePart = dotIdx === -1 ? stripped : stripped.slice(0, dotIdx)
  const fracPart = dotIdx === -1 ? '' : stripped.slice(dotIdx + 1)
  if (fracPart.length > 2) {
    return Result.err('Amount may have at most two decimal places')
  }
  const wholeDigits = wholePart === '' ? '0' : wholePart
  const fracDigits = fracPart.padEnd(2, '0')
  const cents = parseInt(wholeDigits, 10) * 100 + parseInt(fracDigits || '0', 10)
  if (!Number.isFinite(cents)) {
    return Result.err('Amount is not a valid number')
  }
  if (cents <= 0) {
    return Result.err('Amount must be greater than zero')
  }
  return Result.ok(cents)
}
