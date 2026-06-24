# sign-up-mode.ts

**Source:** `src/routes/test/sign-up-mode.ts`

## Purpose

Dev-only test endpoint for inspecting the current `SIGN_UP_MODE`. Mounted at `/test/sign-up-mode`. Guarded by `// PRODUCTION:STOP`.

## Exports

### `testSignUpModeRouter`

Hono sub-router with a single route:

| Method | Path | Purpose                                                      |
| ------ | ---- | ------------------------------------------------------------ |
| `GET`  | `/`  | Returns current `SIGN_UP_MODE` as plain text (`text/plain`) |

Returns the value of `c.env.SIGN_UP_MODE` (falling back to `SIGN_UP_MODES.NO_SIGN_UP`) as a plain-text response. On error, returns `"ERROR"` with HTTP 500.

## Cross-references

- [../../constants.md](../../constants.md) — `STANDARD_SECURE_HEADERS`, `SIGN_UP_MODES`.
- [../../local-types.md](../../local-types.md) — `Bindings` type.
- [../../../e2e-tests/support/mode-helpers.md](../../../e2e-tests/support/mode-helpers.md) — helpers that call this endpoint.

---

See [source-code.md](../../../source-code.md) for the full catalog.
