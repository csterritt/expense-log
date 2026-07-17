# src/lib/test-routes.ts

Determines whether test/debug routes should be enabled. Entire file is stripped in production (`PRODUCTION:STOP`).

## Functions

### isTestRouteEnabled({ nodeEnv, enableTestRoutes, playwright }): boolean

Returns `false` if `nodeEnv === 'production'`. Otherwise returns `true` if `enableTestRoutes === 'true'` or `playwright === '1'`.

Used in `src/index.ts` to conditionally register test routes (set-clock, reset-clock, set-db-failures, database test router, sign-up mode router, SMTP config router, run-cron router).
