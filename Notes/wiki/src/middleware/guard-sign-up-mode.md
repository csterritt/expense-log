# src/middleware/guard-sign-up-mode.ts

Middleware that validates required environment bindings are present at runtime.

## Functions

### validateEnvBindings(c, next): Promise\<Response | void\>

Checks that `BETTER_AUTH_SECRET` and `SIGN_UP_MODE` environment bindings are set and non-empty. If any are missing, logs an error and redirects to sign-in with "Server configuration error" message.

## Dependencies

- `../constants` — `PATHS`
- `../lib/redirects` — `redirectWithError`
- `../local-types` — `Bindings`, `AppVariables`
