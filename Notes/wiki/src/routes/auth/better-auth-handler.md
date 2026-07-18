# src/routes/auth/better-auth-handler.ts

Sets up Better Auth integration with Hono: the API handler and session middleware.

## Functions

### setupBetterAuth(app): void

Registers `app.all('/api/auth/*')` handler that delegates to Better Auth's `auth.handler`. Creates a new auth instance per request from `c.env`.

### setupBetterAuthMiddleware(app): void

Registers `app.use('*')` middleware that calls `auth.api.getSession` to check the current session. Sets `user`, `session`, and `authSession` context variables (or nulls if no session).

## Types

- `BetterAuthVariables` — `{ user: AuthUser | null, session: AuthSession | null, authSession: AuthSessionResponse | null }`

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../local-types` — `Bindings`, `AuthUser`, `AuthSession`, `AuthSessionResponse`
