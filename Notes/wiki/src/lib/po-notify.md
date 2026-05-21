# po-notify.ts

**Source:** `src/lib/po-notify.ts`

## Purpose

Optional Pushover notification helper. Sends a simple text message via the Pushover REST API if both `PO_APP_ID` and `PO_USER_ID` are configured. Issue 15 refactored this module to expose a context-free helper (`pushoverNotifyEnv`) so the scheduled handler can call it without a Hono `Context`.

## Exports

### `pushoverNotifyEnv(env: Bindings, message: string): Promise<void>`

Core implementation. Accepts the raw `Bindings` env directly — no Hono types in its signature, making it callable from a scheduled handler. Short-circuits when `PO_APP_ID` or `PO_USER_ID` are missing/blank. In `development` (`NODE_ENV === 'development'`) it logs a preview instead of sending. Swallows all fetch errors with `console.log('pushoverNotify final error:', err)`.

### `pushoverNotify(c, message): Promise<void>`

Thin Hono-context wrapper. Delegates to `pushoverNotifyEnv(c.env, message)` — behaviour unchanged for existing callers.

## Behaviour

1. Trim `PO_APP_ID` and `PO_USER_ID`; if either is empty, return immediately (no-op).
2. Build `{ token, user, message }` payload.
3. If `NODE_ENV !== 'development'`: POST JSON to `API_URLS.PUSHOVER` via the internal `post` helper.
4. If `NODE_ENV === 'development'`: log `========> Notify would have been sent in production:` and the message.
5. Catch any thrown error and log it; never re-throw.

## Cross-references

- [constants.md](../constants.md) — `API_URLS.PUSHOVER`
- [scheduled.ts](../scheduled.md) — calls `pushoverNotifyEnv` on cron failure (Issue 15)

---

See [source-code.md](../../source-code.md) for the full catalog.
