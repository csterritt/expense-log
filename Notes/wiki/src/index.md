# src/index.ts

Worker entry point. Creates the Hono app, applies global middleware, registers all route builders, and exports `fetch` + `scheduled` handlers.

## Middleware stack (in order)

1. `secureHeaders` — referrer policy
2. `csrf` — CSRF protection (skips `/test/` routes in test mode)
3. `bodyLimit` — 1KB in dev, 4KB in production
4. `logger` — request logging
5. `renderer` — JSX HTML renderer
6. `validateEnvBindings` — runtime env validation
7. DB client init — creates `DrizzleClient` per request, sets in context
8. `setupBetterAuthMiddleware` — session enrichment
9. `setupBetterAuthResponseInterceptor` — auth response → redirect conversion
10. `setupBetterAuth` — Better Auth API catch-all

## Route registration

Routes are registered conditionally based on `SIGN_UP_MODE`:
- **OPEN_SIGN_UP**: `buildSignUp`, `handleSignUp`, `buildAwaitVerification`, `handleResendEmail`
- **GATED_SIGN_UP**: `buildGatedSignUp`, `handleGatedSignUp`, `buildAwaitVerification`, `handleResendEmail`
- **INTEREST_SIGN_UP**: `buildInterestSignUp`, `handleInterestSignUp`, `buildAwaitVerification`, `handleResendEmail`
- **BOTH_SIGN_UP**: `buildGatedInterestSignUp`, `handleGatedInterestSignUp`, `buildAwaitVerification`, `handleResendEmail`

Unconditional routes: expenses, edit-expense, categories, tags, summary, recurring, profile, auth (forgot/reset password, email confirmation, sign-out).

Test routes (`handleSetClock`, `handleResetClock`, `handleSetDbFailures`, test routers) registered only when `isTestRouteEnabledFlag` is true.

`build404` must be last — catch-all for unmatched routes.

## Environment validation

Validates required env vars on startup: `BETTER_AUTH_SECRET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`, `SIGN_UP_MODE`, `EMAIL_SEND_URL`, `EMAIL_SEND_CODE`.

## Dependencies

- `./scheduled` — cron trigger handler for recurring expense materialization
- All route builders under `./routes/`
- `./lib/test-routes` — test route enablement check
- `cloudflare:workers` `env` for environment variable access

## Production build notes

Lines marked `PRODUCTION:REMOVE` are stripped during production builds. This includes test routes, `showRoutes`, `buildRoot`, alternate origin config, and dev-specific body limits.
