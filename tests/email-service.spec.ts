// ====================================
// Tests for email-service.ts production POST delivery
// To run: cd to project root and type 'bun test'
// ====================================

import { describe, it, beforeEach, afterEach } from 'bun:test'
import assert from 'node:assert'

import { sendConfirmationEmail, sendPasswordResetEmail } from '../src/lib/email-service'
import type { Bindings } from '../src/local-types'

const createMockResponse = (status: number, body: string = ''): Response => {
  return new Response(body, {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  })
}

const createProductionEnv = (overrides: Partial<Bindings> = {}): Bindings => ({
  PROJECT_DB: {} as D1Database,
  NODE_ENV: 'production',
  EMAIL_SEND_URL: 'https://email-provider.example.com/send',
  EMAIL_SEND_CODE: 'test-api-code-123',
  ...overrides,
}) as Bindings

describe('email-service production POST delivery', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('sendConfirmationEmail', () => {
    it('succeeds on 2xx response', async () => {
      let fetchCalled = false
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        fetchCalled = true
        return createMockResponse(200, '{"id":"abc"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok')

      assert.ok(fetchCalled, 'fetch should have been called')
    })

    it('throws on 4xx response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(400, '{"error":"Bad request"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
    })

    it('throws on 401 response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(401, '{"error":"Unauthorized"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
    })

    it('throws on 429 response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(429, '{"error":"Rate limited"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
    })

    it('throws on 5xx response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(500, '{"error":"Internal server error"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
    })

    it('throws on network failure', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        throw new TypeError('fetch failed')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
    })

    it('throws when EMAIL_SEND_URL is not configured', async () => {
      let fetchCalled = false
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        fetchCalled = true
        return createMockResponse(200)
      }) as typeof globalThis.fetch

      const env = createProductionEnv({ EMAIL_SEND_URL: undefined })
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
      assert.ok(!fetchCalled, 'fetch should not have been called when URL is missing')
    })

    it('throws when EMAIL_SEND_CODE is not configured', async () => {
      let fetchCalled = false
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        fetchCalled = true
        return createMockResponse(200)
      }) as typeof globalThis.fetch

      const env = createProductionEnv({ EMAIL_SEND_CODE: undefined })
      await assert.rejects(
        () => sendConfirmationEmail(env, 'user@example.com', 'User', 'https://app/verify?token=abc', 'tok'),
        /Failed to send confirmation email/i,
      )
      assert.ok(!fetchCalled, 'fetch should not have been called when code is missing')
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('succeeds on 2xx response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(200, '{"id":"abc"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await sendPasswordResetEmail(env, 'user@example.com', 'User', 'https://app/reset?token=abc', 'tok')
    })

    it('throws on 4xx response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(400, '{"error":"Bad request"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendPasswordResetEmail(env, 'user@example.com', 'User', 'https://app/reset?token=abc', 'tok'),
        /Failed to send password reset email/i,
      )
    })

    it('throws on 5xx response', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return createMockResponse(500, '{"error":"Internal server error"}')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendPasswordResetEmail(env, 'user@example.com', 'User', 'https://app/reset?token=abc', 'tok'),
        /Failed to send password reset email/i,
      )
    })

    it('throws on network failure', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        throw new TypeError('fetch failed')
      }) as typeof globalThis.fetch

      const env = createProductionEnv()
      await assert.rejects(
        () => sendPasswordResetEmail(env, 'user@example.com', 'User', 'https://app/reset?token=abc', 'tok'),
        /Failed to send password reset email/i,
      )
    })

    it('throws when EMAIL_SEND_URL is not configured', async () => {
      const env = createProductionEnv({ EMAIL_SEND_URL: undefined })
      await assert.rejects(
        () => sendPasswordResetEmail(env, 'user@example.com', 'User', 'https://app/reset?token=abc', 'tok'),
        /Failed to send password reset email/i,
      )
    })

    it('throws when EMAIL_SEND_CODE is not configured', async () => {
      const env = createProductionEnv({ EMAIL_SEND_CODE: undefined })
      await assert.rejects(
        () => sendPasswordResetEmail(env, 'user@example.com', 'User', 'https://app/reset?token=abc', 'tok'),
        /Failed to send password reset email/i,
      )
    })
  })
})
