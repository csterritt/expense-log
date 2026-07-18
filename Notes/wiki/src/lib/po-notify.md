# src/lib/po-notify.ts

Pushover notification integration for admin alerts.

## Functions

### pushoverNotifyEnv(env, message): Promise\<void\>

Sends a Pushover notification if `PO_APP_ID` and `PO_USER_ID` are configured. In development mode, logs to console instead of sending. Silently catches errors.

### pushoverNotify(c, message): Promise\<void\>

Wrapper that extracts `env` from Hono context and calls `pushoverNotifyEnv`.

## Internal

### post(url, data): Promise\<Response\>

Posts JSON to Pushover API. Gathers response body as string (JSON, text, or HTML).

## Dependencies

- `../constants` — `API_URLS.PUSHOVER`
- `../local-types` — `Bindings`, `PushoverMessage`
