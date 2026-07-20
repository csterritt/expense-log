// ====================================
// Tests for origin-config.ts
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'
import {
  CANONICAL_ORIGIN,
  STATIC_TRUSTED_ORIGINS,
  getCanonicalOrigin,
  getTrustedOrigins,
  isOriginAllowed,
} from '../src/lib/origin-config'
import type { Bindings } from '../src/local-types'

const makeEnv = (overrides: Partial<Bindings> = {}): Bindings =>
  ({ ALTERNATE_ORIGIN: undefined, ...overrides }) as unknown as Bindings

describe('origin-config module', () => {
  describe('CANONICAL_ORIGIN', () => {
    it('should be a valid URL string', () => {
      assert.ok(typeof CANONICAL_ORIGIN === 'string')
      assert.ok(CANONICAL_ORIGIN.length > 0)
      // Should start with http or https
      assert.ok(/^https?:\/\//.test(CANONICAL_ORIGIN))
    })
  })

  describe('STATIC_TRUSTED_ORIGINS', () => {
    it('should be a non-empty array of URL strings', () => {
      assert.ok(Array.isArray(STATIC_TRUSTED_ORIGINS))
      assert.ok(STATIC_TRUSTED_ORIGINS.length > 0)
      for (const origin of STATIC_TRUSTED_ORIGINS) {
        assert.ok(typeof origin === 'string')
        assert.ok(/^https?:\/\//.test(origin))
      }
    })

    it('should include the canonical origin', () => {
      assert.ok(STATIC_TRUSTED_ORIGINS.includes(CANONICAL_ORIGIN))
    })
  })

  describe('getCanonicalOrigin', () => {
    it('should return the canonical origin string', () => {
      assert.strictEqual(getCanonicalOrigin(), CANONICAL_ORIGIN)
    })
  })

  describe('getTrustedOrigins', () => {
    it('should return static trusted origins when ALTERNATE_ORIGIN is not set', () => {
      const env = makeEnv()
      const origins = getTrustedOrigins(env)
      assert.deepStrictEqual(origins, STATIC_TRUSTED_ORIGINS)
    })

    it('should include ALTERNATE_ORIGIN when set', () => {
      const env = makeEnv({ ALTERNATE_ORIGIN: 'https://example.workers.dev' })
      const origins = getTrustedOrigins(env)
      assert.ok(origins.includes('https://example.workers.dev'))
      assert.strictEqual(origins.length, STATIC_TRUSTED_ORIGINS.length + 1)
    })

    it('should strip leading $ from ALTERNATE_ORIGIN', () => {
      const env = makeEnv({ ALTERNATE_ORIGIN: '$https://example.workers.dev' })
      const origins = getTrustedOrigins(env)
      assert.ok(origins.includes('https://example.workers.dev'))
    })

    it('should not add undefined or empty ALTERNATE_ORIGIN', () => {
      const env = makeEnv({ ALTERNATE_ORIGIN: '' })
      const origins = getTrustedOrigins(env)
      assert.strictEqual(origins.length, STATIC_TRUSTED_ORIGINS.length)
    })
  })

  describe('isOriginAllowed', () => {
    it('should return true for canonical origin', () => {
      const env = makeEnv()
      assert.ok(isOriginAllowed(env)(CANONICAL_ORIGIN))
    })

    it('should return true for static trusted origins', () => {
      const env = makeEnv()
      for (const origin of STATIC_TRUSTED_ORIGINS) {
        assert.ok(isOriginAllowed(env)(origin), `should allow ${origin}`)
      }
    })

    it('should return true for ALTERNATE_ORIGIN when set', () => {
      const env = makeEnv({ ALTERNATE_ORIGIN: 'https://alt.example.com' })
      assert.ok(isOriginAllowed(env)('https://alt.example.com'))
    })

    it('should return false for malicious origins', () => {
      const env = makeEnv()
      assert.ok(!isOriginAllowed(env)('https://malicious-site.com'))
      assert.ok(!isOriginAllowed(env)('https://evil.com'))
    })

    it('should return false for empty origin', () => {
      const env = makeEnv()
      assert.ok(!isOriginAllowed(env)(''))
    })

    it('should not allow ALTERNATE_ORIGIN when not set', () => {
      const env = makeEnv()
      assert.ok(!isOriginAllowed(env)('https://alt.example.com'))
    })
  })
})
