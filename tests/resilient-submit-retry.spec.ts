import { describe, it } from 'bun:test'
import assert from 'node:assert'

import {
  ERROR_PAGE_PATH,
  getRetryDelay,
  isRetryableAttempt,
  MAX_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  RETRY_CAP_DELAY_MS,
} from '../public/js/resilient-submit-logic.js'

describe('resilient submit retry policy', () => {
  it('allows one initial attempt plus four retries with capped full-jitter exponential delays', () => {
    assert.strictEqual(MAX_ATTEMPTS, 5)

    const randomValues = [0, 0.5, 1, 0.25]
    const delays = randomValues.map((random, retryIndex) => getRetryDelay(retryIndex, () => random))
    const bounds = randomValues.map((_, retryIndex) =>
      Math.min(RETRY_CAP_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** retryIndex),
    )

    assert.strictEqual(delays.length, MAX_ATTEMPTS - 1)
    assert.deepStrictEqual(bounds, [
      RETRY_BASE_DELAY_MS,
      RETRY_BASE_DELAY_MS * 2,
      RETRY_CAP_DELAY_MS,
      RETRY_CAP_DELAY_MS,
    ])
    assert.deepStrictEqual(delays, [0, bounds[1] / 2, bounds[2], bounds[3] / 4])
    for (const [index, delay] of delays.entries()) {
      assert.ok(delay >= 0)
      assert.ok(delay <= bounds[index])
      assert.ok(delay <= RETRY_CAP_DELAY_MS)
    }
  })

  it('retries transient errors, host error pages, and 5xx responses', () => {
    assert.strictEqual(isRetryableAttempt({ type: 'rejected' }), true)
    assert.strictEqual(isRetryableAttempt({ type: 'timeout' }), true)
    assert.strictEqual(isRetryableAttempt({ type: 'response', status: 500 }), true)
    assert.strictEqual(isRetryableAttempt({ type: 'response', status: 503 }), true)
    assert.strictEqual(
      isRetryableAttempt({
        type: 'response',
        status: 200,
        url: `https://expense-log.example${ERROR_PAGE_PATH.toUpperCase()}`,
      }),
      true,
    )

    assert.strictEqual(
      isRetryableAttempt({
        type: 'response',
        status: 200,
        url: 'https://expense-log.example/expenses',
      }),
      false,
    )
    assert.strictEqual(isRetryableAttempt({ type: 'response', status: 200 }), false)
    assert.strictEqual(isRetryableAttempt({ type: 'response', status: 303 }), false)
    assert.strictEqual(isRetryableAttempt({ type: 'response', status: 400 }), false)
    assert.strictEqual(isRetryableAttempt({ type: 'response', status: 499 }), false)
  })
})
