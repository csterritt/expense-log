// ====================================
// Tests for src/lib/po-notify.ts — pushoverNotifyEnv
// To run: cd tests && bun test po-notify.spec.ts
// ====================================

import { describe, it, beforeEach, afterEach, spyOn } from 'bun:test'
import assert from 'node:assert'
import type { Bindings } from '../src/local-types'

import { pushoverNotifyEnv } from '../src/lib/po-notify'

const makeEnv = (overrides: Partial<Bindings> = {}): Bindings =>
  ({
    PROJECT_DB: {} as D1Database,
    Session: null as any,
    PO_APP_ID: 'test-app-id',
    PO_USER_ID: 'test-user-id',
    NODE_ENV: 'production',
    ...overrides,
  }) as Bindings

describe('pushoverNotifyEnv', () => {
  let fetchSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 1 }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('(a) is a no-op when PO_APP_ID is missing', async () => {
    await pushoverNotifyEnv(makeEnv({ PO_APP_ID: undefined }), 'hello')
    assert.strictEqual(fetchSpy.mock.calls.length, 0)
  })

  it('(a) is a no-op when PO_APP_ID is blank', async () => {
    await pushoverNotifyEnv(makeEnv({ PO_APP_ID: '   ' }), 'hello')
    assert.strictEqual(fetchSpy.mock.calls.length, 0)
  })

  it('(b) is a no-op when PO_USER_ID is missing', async () => {
    await pushoverNotifyEnv(makeEnv({ PO_USER_ID: undefined }), 'hello')
    assert.strictEqual(fetchSpy.mock.calls.length, 0)
  })

  it('(b) is a no-op when PO_USER_ID is blank', async () => {
    await pushoverNotifyEnv(makeEnv({ PO_USER_ID: '  ' }), 'hello')
    assert.strictEqual(fetchSpy.mock.calls.length, 0)
  })

  it('(c) calls fetch once with Pushover URL and correct JSON body when not development', async () => {
    await pushoverNotifyEnv(makeEnv({ NODE_ENV: 'production' }), 'test message')
    assert.strictEqual(fetchSpy.mock.calls.length, 1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    assert.strictEqual(url, 'https://api.pushover.net/1/messages.json')
    const body = JSON.parse(init.body as string)
    assert.strictEqual(body.token, 'test-app-id')
    assert.strictEqual(body.user, 'test-user-id')
    assert.strictEqual(body.message, 'test message')
  })

  it('(d) skips network call and logs preview in development', async () => {
    const logs: string[] = []
    const logSpy = spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '))
    })
    try {
      await pushoverNotifyEnv(makeEnv({ NODE_ENV: 'development' }), 'dev message')
      assert.strictEqual(fetchSpy.mock.calls.length, 0)
      assert.ok(logs.some((l) => l.includes('dev message')))
    } finally {
      logSpy.mockRestore()
    }
  })

  it('(e) swallows a thrown fetch rejection without re-throwing', async () => {
    fetchSpy.mockRejectedValue(new Error('network failure'))
    await assert.doesNotReject(() =>
      pushoverNotifyEnv(makeEnv({ NODE_ENV: 'production' }), 'oops'),
    )
  })
})
