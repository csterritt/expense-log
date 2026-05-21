# scheduled.spec.ts

**Source:** `tests/scheduled.spec.ts`

## Purpose

Unit tests for `src/scheduled.ts` (Issue 15). Uses `createScheduled` with injected mock deps (no `mock.module`) to avoid cross-file module-registry pollution. No real DB, network, or Hono context is needed.

## Test cases

1. **invokes materializeRecurring with (db, todayEt()) exactly once** — verifies `materialize` mock is called once, first arg is truthy (the mock db), second arg matches `YYYY-MM-DD` pattern.
2. **does NOT call pushoverNotifyEnv when result is ok with no failures** — `notify` mock call count is zero.
3. **calls pushoverNotifyEnv once with failure count when failed.length > 0 and PO env set** — one failed template; `notify` called once; message contains `'1'`.
4. **calls pushoverNotifyEnv once with error text when result is err** — `materialize` returns `Result.err(new Error('db timeout'))`; `notify` called once with message containing `'db timeout'`.
5. **does not re-throw when materializeRecurring throws, and calls pushoverNotifyEnv once** — synchronous throw inside `materialize`; handler does not reject; `notify` called once.
6. **createDbClient receives env.PROJECT_DB** — `dbFactory` mock called once with `env.PROJECT_DB`.

## Test setup

- `createScheduled({ dbFactory, materialize, notify })` factory used directly — no `mock.module`.
- `mock()` stubs for `materializeMock`, `notifyMock`, `dbFactoryMock` cleared in `beforeEach`.
- `makeEnv()` builds a minimal `Bindings` with `PO_APP_ID`/`PO_USER_ID` set.
- `makeEvent()` / `makeCtx()` provide minimal `ScheduledEvent` / `ExecutionContext` stubs.

## Dependencies

- `src/scheduled` (`createScheduled`)
- `src/local-types` (type only)
- `src/lib/db/expense-access` (type only — `MaterializeRecurringResult`)
- `true-myth`

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
