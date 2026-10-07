/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared retry policy for resilient form submissions.
 * @module resilient-submit-logic
 */

export const MAX_ATTEMPTS = 5
export const ERROR_PAGE_PATH = '/ErrorPage.html'
 export const RETRY_BASE_DELAY_MS = 500 
 export const RETRY_CAP_DELAY_MS = 2_000 
 export const ATTEMPT_TIMEOUT_MS = 10_000 

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
 * @param {{ type: 'rejected' | 'timeout' } | { type: 'response', status: number, url?: string }} attempt
 * @param {string} errorPagePath Path of the host-served fallback error page.
 * @returns {boolean} Whether the submission should be retried.
 */
export const isRetryableAttempt = (attempt, errorPagePath = ERROR_PAGE_PATH) =>
  attempt.type === 'rejected' ||
  attempt.type === 'timeout' ||
  attempt.status >= 500 ||
  (attempt.type === 'response' &&
    Boolean(attempt.url) &&
    new URL(attempt.url).pathname.toLowerCase() === errorPagePath.toLowerCase())
