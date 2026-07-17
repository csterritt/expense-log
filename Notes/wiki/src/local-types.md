# src/local-types.ts

TypeScript type definitions for the application's Bindings, auth types, and Hono context.

## Types

### Bindings

Cloudflare Worker environment bindings interface:
- `PROJECT_DB: D1Database` — D1 database binding
- `SIGN_UP_MODE`, `EMAIL_SEND_URL`, `EMAIL_SEND_CODE` — app config
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN` — Cloudflare API
- `PO_APP_ID`, `PO_USER_ID` — Pushover notifications
- `BETTER_AUTH_SECRET` — auth secret
- `SMTP_SERVER_HOST`, `SMTP_SERVER_PORT`, `SMTP_SERVER_USER`, `SMTP_SERVER_PASSWORD` — email SMTP
- `NODE_ENV`, `ALTERNATE_ORIGIN`, `PLAYWRIGHT`, `ENABLE_TEST_ROUTES` — dev/test only (PRODUCTION:REMOVE)

### AuthUser

User data from Better Auth session: `id`, `email`, `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`.

### AuthSession

Session data from Better Auth: `id`, `userId`, `expiresAt`, `token`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`.

### AuthSessionResponse

Combined `{ user: AuthUser, session: AuthSession }`.

### AppVariables

Variables stored in Hono context: `db`, `user`, `session`, `authSession`, `signInEmail`.

### DrizzleClient

Type alias for `ReturnType<typeof createDbClient>`.

### AppEnv

`{ Bindings: Bindings, Variables: AppVariables }` — Hono environment type.

### AppContext

`Context<AppEnv>` — typed Hono context.

### SignInSession

Legacy session data structure (id, token, userId, signedIn, attemptCount, timestamps).

### PushoverMessage

`{ token, user, message }` for Pushover API.

### FetchResponse

`{ headers, json(), text() }` for fetch response helpers.
