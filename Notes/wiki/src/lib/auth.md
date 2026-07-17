# src/lib/auth.ts

Better Auth instance factory. Configures email/password authentication, email verification, password reset, and session management.

## Exports

### createAuth(env: Bindings): Auth

Creates a Better Auth instance with:
- **Drizzle adapter** with SQLite provider and the app's schema
- **Email/password**: enabled, requires email verification, min 8 / max 128 char passwords
- **sendResetPassword**: delegates to `sendPasswordResetEmail` from `email-service.ts`
- **sendVerificationEmail**: delegates to `sendConfirmationEmail` from `email-service.ts`
- **Session**: 30-day expiry, 1-day update age, 5-minute cookie cache
- **Trusted origins**: localhost in dev, production domains in prod
- **Base URL**: localhost:3000 in dev, production domain in prod
- **Redirect**: `/expenses` after successful sign-in
- **Secret**: `env.BETTER_AUTH_SECRET`

### Auth

Type alias for `ReturnType<typeof createAuth>`.

## Dependencies

- `better-auth` — auth library
- `better-auth/adapters/drizzle` — Drizzle ORM adapter
- `../db/client` — Drizzle client factory
- `../db/schema` — table definitions
- `./email-service` — email sending functions
- `../constants` — DURATIONS for session config
