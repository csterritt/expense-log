/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared retry policy for resilient form submissions.
 * @module resilient-submit-logic
 */

export const MAX_ATTEMPTS = 5
// export const RETRY_BASE_DELAY_MS = 500 // PRODUCTION:UNCOMMENT
export const RETRY_BASE_DELAY_MS = 10 // PRODUCTION:REMOVE
// export const RETRY_CAP_DELAY_MS = 2_000 // PRODUCTION:UNCOMMENT
export const RETRY_CAP_DELAY_MS = 40 // PRODUCTION:REMOVE
// export const ATTEMPT_TIMEOUT_MS = 10_000 // PRODUCTION:UNCOMMENT
export const ATTEMPT_TIMEOUT_MS = 100 // PRODUCTION:REMOVE

/**
 * Returns the full-jitter delay before a retry.
 *
 * @param {number} retryIndex Zero-based retry index.
 * @param {() => number} random Random value provider.
 * @returns {number} Delay in milliseconds.
 */
export const getRetryDelay = (retryIndex, random = Math.random) => {
  const cappedDelay = Math.min(RETRY_CAP_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** retryIndex)
  return Math.floor(random() * cappedDelay)
}

/**
 * Determines whether an attempt failed due to transient infrastructure.
 *
 * @param {{ type: 'rejected' | 'timeout' } | { type: 'response', status: number }} attempt
 * @returns {boolean} Whether the submission should be retried.
 */
export const isRetryableAttempt = (attempt) =>
  attempt.type === 'rejected' || attempt.type === 'timeout' || attempt.status >= 500
