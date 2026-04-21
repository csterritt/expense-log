# index.ts

**Source:** `src/index.ts`

## Purpose

Main application entry point. Sets up the Hono app with middleware chain, environment validation, sign-up-mode conditional route registration, and test-only route mounting.

## Environment validation

`validateEnvironmentVariables()` runs at module load time and checks that all required environment variables are set:

- `BETTER_AUTH_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DATABASE_ID`
- `CLOUDFLARE_D1_TOKEN`
- `SIGN_UP_MODE`
- `EMAIL_SEND_URL`
- `EMAIL_SEND_CODE`

If any are missing, it logs the missing vars and returns `false` (the app still starts, but the middleware guard will catch missing bindings per-request).

## Middleware chain (in order)

1. `secureHeaders` — referrer policy `strict-origin-when-cross-origin`
2. CSRF protection (`hono/csrf`) — skipped for `/test/*` when test routes are enabled; allows `localhost` origins in dev
3. `bodyLimit` — 1 KB max in dev (4 KB in production)
4. `logger` — Hono request logger
5. `renderer` — JSX layout renderer
6. `validateEnvBindings` — runtime check for `BETTER_AUTH_SECRET` and `SIGN_UP_MODE`
7. Database client injection — creates Drizzle client from `PROJECT_DB` and sets it on context

## Auth setup

1. `setupBetterAuthMiddleware` — session/user context injection
2. `setupBetterAuthResponseInterceptor` — intercepts `/api/auth/sign-in/email` responses to convert JSON into user-friendly redirects
3. `setupBetterAuth` — mounts `/api/auth/*` handler

## Route registration

Routes are registered based on `SIGN_UP_MODE`:

| Mode               | Routes registered                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `OPEN_SIGN_UP`     | `buildSignUp`, `handleSignUp`, `buildAwaitVerification`, `handleResendEmail`                           |
| `GATED_SIGN_UP`    | `buildGatedSignUp`, `handleGatedSignUp`, `buildAwaitVerification`, `handleResendEmail`                 |
| `INTEREST_SIGN_UP` | `buildInterestSignUp`, `handleInterestSignUp`, `buildAwaitVerification`, `handleResendEmail`           |
| `BOTH_SIGN_UP`     | `buildGatedInterestSignUp`, `handleGatedInterestSignUp`, `buildAwaitVerification`, `handleResendEmail` |

Always registered regardless of mode:

- `buildRoot` — `/`
- `buildPrivate` — `/private`
- `buildSignIn` — `/auth/sign-in`
- `buildForgotPassword` — `/auth/forgot-password`
- `buildWaitingForReset` — `/auth/waiting-for-reset`
- `buildResetPassword` — `/auth/reset-password`
- `buildEmailConfirmation` — `/auth/verify-email` and `/auth/email-sent`
- `buildSignOut` — `/auth/sign-out`
- `handleSignOut` — `POST /auth/sign-out`
- `handleForgotPassword` — `POST /auth/forgot-password`
- `handleResetPassword` — `POST /auth/reset-password`
- `buildProfile` — `/profile`
- `buildDeleteConfirm` — `/profile/delete-confirm`
- `handleChangePassword` — `POST /profile`
- `handleDeleteAccount` — `POST /profile/delete`

## Test routes (dev only)

When `isTestRouteEnabledFlag` is true:

- `handleSetClock` — `GET /auth/set-clock/:delta`
- `handleResetClock` — `GET /auth/reset-clock`
- `handleSetDbFailures` — `GET /auth/set-db-failures/:name/:times`
- `testDatabaseRouter` — mounted at `/test/database`
- `testSignUpModeRouter` — mounted at `/test/sign-up-mode`
- `testSmtpRouter` — mounted at `/test`

## 404

`build404` is registered last as the catch-all `notFound` handler.

## Logging

- `✅ All required environment variables are set`
- `❌ ERROR: Missing required environment variables: ...`
- `==============> Environment variables are not valid!` (repeated 5x on failure)
- `Already signed in` — when redirecting authenticated users from sign-in/up pages

## Cross-references

- [local-types.md](local-types.md) — `Bindings`, `AppVariables`
- [constants.md](constants.md) — `HTML_STATUS`, `SIGN_UP_MODES`
- [renderer.md](renderer.md) — `renderer`
- [db/client.md](db/client.md) — `createDbClient`
- [routes/auth/better-auth-handler.md](routes/auth/better-auth-handler.md) — `setupBetterAuth`
- [routes/auth/better-auth-response-interceptor.md](routes/auth/better-auth-response-interceptor.md) — `setupBetterAuthResponseInterceptor`
- [middleware/guard-sign-up-mode.md](middleware/guard-sign-up-mode.md) — `validateEnvBindings`

---

See [source-code.md](../source-code.md) for the full catalog.
