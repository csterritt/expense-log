# guard-sign-up-mode.ts

**Source:** `src/middleware/guard-sign-up-mode.ts`

## Purpose

Actually **validates required environment bindings at runtime**. (Despite the filename, this is the `validateEnvBindings` middleware, not a sign-up-mode guard.)

## Export

### `validateEnvBindings(c, next): Promise<Response | void>`

Checks that `BETTER_AUTH_SECRET` and `SIGN_UP_MODE` are present in `c.env`. If any are missing or empty, logs `❌ Missing required environment bindings: ...` and uses `redirectWithError` (from `lib/redirects.tsx`) to redirect to `PATHS.AUTH.SIGN_IN` with the error message `'Server configuration error. Please contact the administrator.'`. Per the project web-behavior rule, request handlers and middleware never return plain text.

## Logging

- `❌ Missing required environment bindings: BETTER_AUTH_SECRET, SIGN_UP_MODE`

---

See [source-code.md](../../source-code.md) for the full catalog.
