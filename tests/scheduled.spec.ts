// ====================================
// Tests for src/scheduled.ts
// Uses createScheduled with injected deps to avoid mock.module cross-file pollution.
// To run: cd tests && bun test scheduled.spec.ts
// ====================================

import { describe, it, beforeEach, mock } from 'bun:test'
import assert from 'node:assert'
import { Result } from 'true-myth'
import type { Bindings } from '../src/local-types'
import type { MaterializeRecurringResult } from '../src/lib/db/expense-access'
import { createScheduled } from '../src/scheduled'

// ---- injectable mocks ----

const materializeMock = mock(
  async (_db: unknown, _today: string): Promise<Result<MaterializeRecurringResult, Error>> =>
    Result.ok({ generated: 0, skipped: 0, failed: [] }),
)

const notifyMock = mock(async (_env: unknown, _message: string): Promise<void> => {})

const dbFactoryMock = mock((_db: unknown) => ({ _isMockDb: true }))

const makeHandler = () =>
  createScheduled({
    dbFactory: dbFactoryMock as any,
    materialize: materializeMock as any,
    notify: notifyMock as any,
  })

// ---- helpers ----

const makeEnv = (overrides: Partial<Bindings> = {}): Bindings =>
  ({
    PROJECT_DB: { _isMockD1: true } as unknown as D1Database,
    Session: null as any,
    PO_APP_ID: 'test-app-id',
    PO_USER_ID: 'test-user-id',
    NODE_ENV: 'production',
    ...overrides,
  }) as Bindings

const makeEvent = (): ScheduledEvent =>
  ({ scheduledTime: Date.now(), cron: '0 5 * * *' } as ScheduledEvent)

const makeCtx = (): ExecutionContext =>
  ({ waitUntil: (_p: Promise<unknown>) => {} } as ExecutionContext)

describe('scheduled handler', () => {
  beforeEach(() => {
    materializeMock.mockClear()
    notifyMock.mockClear()
    dbFactoryMock.mockClear()
  })

  it('1. invokes materializeRecurring with (db, todayEt()) exactly once', async () => {
    materializeMock.mockResolvedValueOnce(
      Result.ok({ generated: 2, skipped: 1, failed: [] }),
    )
    await makeHandler()(makeEvent(), makeEnv(), makeCtx())
    assert.strictEqual(materializeMock.mock.calls.length, 1)
    const [passedDb, passedDate] = materializeMock.mock.calls[0] as [unknown, string]
    assert.ok(passedDb)
    assert.match(passedDate, /^\d{4}-\d{2}-\d{2}$/)
  })

  it('2. does NOT call pushoverNotifyEnv when result is ok with no failures', async () => {
    materializeMock.mockResolvedValueOnce(
      Result.ok({ generated: 3, skipped: 2, failed: [] }),
    )
    await makeHandler()(makeEvent(), makeEnv(), makeCtx())
    assert.strictEqual(notifyMock.mock.calls.length, 0)
  })

  it('3. calls pushoverNotifyEnv once with failure count when failed.length > 0 and PO env set', async () => {
    materializeMock.mockResolvedValueOnce(
      Result.ok({
        generated: 1,
        skipped: 0,
        failed: [{ recurringId: 'rid-1', error: 'insert failed' }],
      }),
    )
    await makeHandler()(makeEvent(), makeEnv(), makeCtx())
    assert.strictEqual(notifyMock.mock.calls.length, 1)
    const [_env, message] = notifyMock.mock.calls[0] as [unknown, string]
    assert.ok((message as string).includes('1'))
  })

  it('4. calls pushoverNotifyEnv once with error text when result is err', async () => {
    materializeMock.mockResolvedValueOnce(
      Result.err(new Error('db timeout')),
    )
    await makeHandler()(makeEvent(), makeEnv(), makeCtx())
    assert.strictEqual(notifyMock.mock.calls.length, 1)
    const [_env, message] = notifyMock.mock.calls[0] as [unknown, string]
    assert.ok((message as string).includes('db timeout'))
  })

  it('5. does not re-throw when materializeRecurring throws, and calls pushoverNotifyEnv once', async () => {
    materializeMock.mockImplementationOnce(() => {
      throw new Error('sync boom')
    })
    await assert.doesNotReject(() => makeHandler()(makeEvent(), makeEnv(), makeCtx()))
    assert.strictEqual(notifyMock.mock.calls.length, 1)
  })

  it('6. createDbClient receives env.PROJECT_DB', async () => {
    materializeMock.mockResolvedValueOnce(
      Result.ok({ generated: 0, skipped: 0, failed: [] }),
    )
    const env = makeEnv()
    await makeHandler()(makeEvent(), env, makeCtx())
    assert.strictEqual(dbFactoryMock.mock.calls.length, 1)
    assert.strictEqual(dbFactoryMock.mock.calls[0][0], env.PROJECT_DB)
  })
})
