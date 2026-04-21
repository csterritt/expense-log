# sign-up-mode.ts

**Source:** `src/routes/test/sign-up-mode.ts`

## Purpose

Dev-only test endpoint for inspecting or overriding the current `SIGN_UP_MODE`. Mounted at `/test/sign-up-mode`.

## Exports

### `testSignUpModeRouter`

Hono sub-router with routes:

| Method | Path | Purpose                                                   |
| ------ | ---- | --------------------------------------------------------- |
| `GET`  | `/`  | Returns current `SIGN_UP_MODE` as JSON                    |
| `POST` | `/`  | Accepts `{ mode }` to override `SIGN_UP_MODE` for testing |

## Cross-references

- [e2e-tests/support/mode-helpers.md](../../../e2e-tests/support/mode-helpers.md) — helpers that call these endpoints

---

See [source-code.md](../../../source-code.md) for the full catalog.
