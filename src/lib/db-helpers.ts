/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import retry from 'async-retry'
import Result from 'true-myth/result'
import { STANDARD_RETRY_OPTIONS } from '../constants'

export const withRetry = async <T>(
  operationName: string,
  operation: () => Promise<Result<T, Error>>,
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

export const toResult = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
  try {
    return Result.ok(await fn())
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
