# local-types.ts

**Source:** `src/local-types.ts`

## Purpose

Central TypeScript type definitions for the application. Defines Hono `Bindings`, context `Variables`, auth-related types, and utility interfaces.

## Types

### `SignInSession`

Legacy session shape with `id`, `token`, `userId`, `signedIn`, `attemptCount`, `createdAt`, `updatedAt`, `expiresAt`.

### `Bindings`

Hono environment bindings. Includes:

- `PROJECT_DB` — D1Database
- `Session` — `Maybe<SignInSession>`
- Optional: `db`, `signUpType`, `SIGN_UP_MODE`, `EMAIL_SEND_URL`, `EMAIL_SEND_CODE`, `CLOUDFLARE_*`, `PO_APP_ID`, `PO_USER_ID`, `ALTERNATE_ORIGIN`, `BETTER_AUTH_SECRET`, `NODE_ENV`, `PLAYWRIGHT`, `SMTP_SERVER_*`, `ENABLE_TEST_ROUTES`

### `DrizzleClient`

Return type of `createDbClient`.

### `AuthUser`

Better-auth user shape: `id`, `email`, `name`, `emailVerified`, `image`, `createdAt`, `updatedAt`.

### `AuthSession`

Better-auth session shape: `id`, `userId`, `expiresAt`, `token`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`.

### `AuthSessionResponse`

Combined `{ user: AuthUser; session: AuthSession }`.

### `AppVariables`

Hono context variables set by middleware:

- `db` — DrizzleClient
- `user` — AuthUser | null
- `session` — AuthSession | null
- `authSession` — AuthSessionResponse | null
- `signInEmail` — captured from sign-in form

### `AppEnv`

`{ Bindings: Bindings; Variables: AppVariables }`

### `AppContext`

`Context<AppEnv>` — full Hono context type.

### `PushoverMessage`

`{ token: string; user: string; message: string }`

### `FetchResponse`

Simplified fetch response interface for `pushoverNotify`.

---

See [source-code.md](../source-code.md) for the full catalog.
