// ====================================
// Tests for auth validation schemas (security edge cases)
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'

import {
  validateRequest,
  ResetPasswordFormSchema,
  ChangePasswordFormSchema,
} from '../src/lib/validators'

const VALID_PASSWORD = 'validpassword123'
const MAX_PASSWORD = 'a'.repeat(128)
const TOO_LONG_PASSWORD = 'a'.repeat(129)
const MAX_TOKEN = 'a'.repeat(512)
const TOO_LONG_TOKEN = 'a'.repeat(513)

describe('ResetPasswordFormSchema', () => {
  it('accepts a token at the 512-char maximum', () => {
    const [ok] = validateRequest(
      { token: MAX_TOKEN, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD },
      ResetPasswordFormSchema,
    )
    assert.strictEqual(ok, true)
  })

  it('rejects a token longer than 512 chars', () => {
    const [ok, , err] = validateRequest(
      { token: TOO_LONG_TOKEN, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD },
      ResetPasswordFormSchema,
    )
    assert.strictEqual(ok, false)
    assert.ok(err?.includes('Invalid reset token'))
  })

  it('accepts a password at the 128-char maximum', () => {
    const [ok] = validateRequest(
      { token: 'valid-token', password: MAX_PASSWORD, confirmPassword: MAX_PASSWORD },
      ResetPasswordFormSchema,
    )
    assert.strictEqual(ok, true)
  })

  it('rejects a password longer than 128 chars', () => {
    const [ok, , err] = validateRequest(
      { token: 'valid-token', password: TOO_LONG_PASSWORD, confirmPassword: TOO_LONG_PASSWORD },
      ResetPasswordFormSchema,
    )
    assert.strictEqual(ok, false)
    assert.ok(err?.includes('at most 128'))
  })
})

describe('ChangePasswordFormSchema', () => {
  it('accepts a new password at the 128-char maximum', () => {
    const [ok] = validateRequest(
      {
        currentPassword: 'current-password',
        newPassword: MAX_PASSWORD,
        confirmPassword: MAX_PASSWORD,
      },
      ChangePasswordFormSchema,
    )
    assert.strictEqual(ok, true)
  })

  it('rejects a new password longer than 128 chars', () => {
    const [ok, , err] = validateRequest(
      {
        currentPassword: 'current-password',
        newPassword: TOO_LONG_PASSWORD,
        confirmPassword: TOO_LONG_PASSWORD,
      },
      ChangePasswordFormSchema,
    )
    assert.strictEqual(ok, false)
    assert.ok(err?.includes('at most 128'))
  })
})
