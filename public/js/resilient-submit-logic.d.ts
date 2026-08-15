export const MAX_ATTEMPTS: number
export const ERROR_PAGE_PATH: string
export const RETRY_BASE_DELAY_MS: number
export const RETRY_CAP_DELAY_MS: number
export const ATTEMPT_TIMEOUT_MS: number
export const getRetryDelay: (retryIndex: number, random?: () => number) => number
export const isRetryableAttempt: (
  attempt: { type: 'rejected' | 'timeout' } | { type: 'response'; status: number; url?: string },
  errorPagePath?: string,
) => boolean
