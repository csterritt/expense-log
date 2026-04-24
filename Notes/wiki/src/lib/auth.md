# auth.ts

**Source:** `src/lib/auth.ts`

## Purpose

Factory that creates and configures the better-auth instance. Called once per request (via `createAuth(env)`).

## Export

### `createAuth(env: Bindings) => BetterAuth`

Builds a better-auth instance with the following configuration:

- **Database** — `drizzleAdapter(dbClient, { schema })` from `../db/client.ts` and `../db/schema.ts`
- **Email & Password** — enabled, `requireEmailVerification: true`
- **Email Verification** — `sendVerificationEmail` callback sends a confirmation email via `sendConfirmationEmail()` from `email-service.ts`
- **Password Reset** — `sendResetPassword` callback sends a reset email via `sendPasswordResetEmail()` from `email-service.ts`
- **Session** — expires in `THIRTY_DAYS_IN_SECONDS`, updates every `ONE_DAY_IN_SECONDS`, cookie cache enabled with `FIVE_MINUTES_IN_SECONDS` max age
- **Trusted Origins** — `['http://localhost:3000', 'http://localhost:8787', 'https://cls.cloud', 'https://mini-auth.cls.cloud']`
- **Redirect after sign-in** — `redirectTo: '/expenses'`
- **Secret** — `env.BETTER_AUTH_SECRET`

## Cross-references

- [db-access.md](db-access.md) — `createDbClient`
- [email-service.md](email-service.md) — `sendConfirmationEmail`, `sendPasswordResetEmail`
- [constants.md](../constants.md) — `DURATIONS`
- [local-types.md](../local-types.md) — `Bindings`

---

See [source-code.md](../../source-code.md) for the full catalog.
