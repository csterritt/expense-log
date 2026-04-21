# po-notify.ts

**Source:** `src/lib/po-notify.ts`

## Purpose

Optional Pushover notification helper. Sends a simple text message via the Pushover REST API if both `PO_APP_ID` and `PO_USER_ID` are configured.

## Export

### `pushoverNotify(c, message): Promise<void>`

If `env.PO_APP_ID` and `env.PO_USER_ID` are present, POSTs `{ token, user, message }` to `API_URLS.PUSHOVER` (via the internal `post` helper). Silently swallows errors. In `development` mode it only logs instead of sending.

## Cross-references

- [constants.md](../constants.md) — `API_URLS.PUSHOVER`

---

See [source-code.md](../../source-code.md) for the full catalog.
