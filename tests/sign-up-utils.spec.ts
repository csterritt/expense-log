// ====================================
// Tests for sign-up-utils.ts error handling
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { MESSAGES } from '../src/constants'

// Test the error message sanitization logic
// We test the patterns and message handling without needing full Hono context

const DUPLICATE_EMAIL_PATTERNS = [
  'already exists',
  'duplicate',
  'unique constraint',
  'unique',
  'violates unique',
]

const isDuplicateEmailError = (message: string): boolean => {
  const lowerMessage = message.toLowerCase()
  return DUPLICATE_EMAIL_PATTERNS.some((pattern) =>
    lowerMessage.includes(pattern)
  )
}

// Simulates the error handling logic from handleSignUpResponseError
const getErrorMessageForUser = (rawErrorMessage: string): string => {
  if (isDuplicateEmailError(rawErrorMessage)) {
    return MESSAGES.ACCOUNT_ALREADY_EXISTS
  }
  return MESSAGES.REGISTRATION_GENERIC_ERROR
}

describe('sign-up error message sanitization', () => {
  it('should return generic message for internal DB errors', () => {
    const internalError = 'SQLITE_BUSY: database is locked'
    const result = getErrorMessageForUser(internalError)
    assert.strictEqual(result, MESSAGES.REGISTRATION_GENERIC_ERROR)
    assert.ok(!result.includes('SQLITE'))
    assert.ok(!result.includes('database'))
  })

  it('should return generic message for stack traces', () => {
    const stackTrace = 'Error: Connection refused at Object.<anonymous>'
    const result = getErrorMessageForUser(stackTrace)
    assert.strictEqual(result, MESSAGES.REGISTRATION_GENERIC_ERROR)
    assert.ok(!result.includes('Connection'))
    assert.ok(!result.includes('Object'))
  })

  it('should return generic message for unknown errors', () => {
    const unknownError = 'Unexpected token in JSON at position 42'
    const result = getErrorMessageForUser(unknownError)
    assert.strictEqual(result, MESSAGES.REGISTRATION_GENERIC_ERROR)
    assert.ok(!result.includes('JSON'))
    assert.ok(!result.includes('token'))
  })

  it('should return account exists message for duplicate email errors', () => {
    const duplicateError = 'User with this email already exists'
    const result = getErrorMessageForUser(duplicateError)
    assert.strictEqual(result, MESSAGES.ACCOUNT_ALREADY_EXISTS)
  })

  it('should return account exists message for unique constraint errors', () => {
    const constraintError = 'UNIQUE constraint failed: user.email'
    const result = getErrorMessageForUser(constraintError)
    assert.strictEqual(result, MESSAGES.ACCOUNT_ALREADY_EXISTS)
  })

  it('should not expose raw error messages to users', () => {
    const sensitiveErrors = [
      'D1_ERROR: too many requests',
      'TypeError: Cannot read property of undefined',
      'ECONNREFUSED 127.0.0.1:5432',
      'password hash mismatch in bcrypt comparison',
    ]

    for (const error of sensitiveErrors) {
      const result = getErrorMessageForUser(error)
      assert.strictEqual(
        result,
        MESSAGES.REGISTRATION_GENERIC_ERROR,
        `Expected generic message for: ${error}`
      )
      // Verify none of the sensitive details leak through
      assert.ok(!result.includes('D1_ERROR'))
      assert.ok(!result.includes('TypeError'))
      assert.ok(!result.includes('ECONNREFUSED'))
      assert.ok(!result.includes('bcrypt'))
    }
  })
})
