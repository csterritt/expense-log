// ====================================
// Tests for db-access.ts retry behavior
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import retry from 'async-retry'
import Result from 'true-myth/result'

const STANDARD_RETRY_OPTIONS = {
  minTimeout: 1,
  retries: 3,
}

const withRetry = async <T>(
  operationName: string,
  operation: () => Promise<Result<T, Error>>
): Promise<Result<T, Error>> => {
  try {
    return await retry(async () => {
      const result = await operation()
      if (result.isErr) {
        throw result.error
      }
      return result
    }, STANDARD_RETRY_OPTIONS)
  } catch (err) {
    console.log(`${operationName} final error:`, err)
    return Result.err(err instanceof Error ? err : new Error(String(err)))
  }
}

describe('withRetry function', () => {
  it('should return success on first try when operation succeeds', async () => {
    let callCount = 0
    const operation = async (): Promise<Result<string, Error>> => {
      callCount++
      return Result.ok('success')
    }

    const result = await withRetry('test', operation)

    assert.strictEqual(result.isOk, true)
    assert.strictEqual(result.isOk && result.value, 'success')
    assert.strictEqual(callCount, 1)
  })

  it('should retry on Result.err and eventually succeed', async () => {
    let callCount = 0
    const operation = async (): Promise<Result<string, Error>> => {
      callCount++
      if (callCount < 3) {
        return Result.err(new Error('transient failure'))
      }
      return Result.ok('success after retries')
    }

    const result = await withRetry('test', operation)

    assert.strictEqual(result.isOk, true)
    assert.strictEqual(result.isOk && result.value, 'success after retries')
    assert.strictEqual(callCount, 3)
  })

  it('should return Result.err after exhausting all retries', async () => {
    let callCount = 0
    const operation = async (): Promise<Result<string, Error>> => {
      callCount++
      return Result.err(new Error('persistent failure'))
    }

    const result = await withRetry('test', operation)

    assert.strictEqual(result.isErr, true)
    assert.strictEqual(
      result.isErr && result.error.message,
      'persistent failure'
    )
    assert.strictEqual(callCount, 4) // 1 initial + 3 retries
  })

  it('should retry on thrown exceptions', async () => {
    let callCount = 0
    const operation = async (): Promise<Result<string, Error>> => {
      callCount++
      if (callCount < 2) {
        throw new Error('thrown error')
      }
      return Result.ok('recovered')
    }

    const result = await withRetry('test', operation)

    assert.strictEqual(result.isOk, true)
    assert.strictEqual(result.isOk && result.value, 'recovered')
    assert.strictEqual(callCount, 2)
  })

  it('should preserve the original error after retries exhaust', async () => {
    const originalError = new Error('original error message')
    const operation = async (): Promise<Result<string, Error>> => {
      return Result.err(originalError)
    }

    const result = await withRetry('test', operation)

    assert.strictEqual(result.isErr, true)
    assert.strictEqual(result.isErr && result.error, originalError)
  })
})
