# Source Code Catalog

Catalog of all source files under `src/` (71 files total), organized by category. Each file links to its individual wiki page.

## Core application

- [src/index.ts](./src/index.md) — Hono app setup, middleware chain, route registration, environment variable validation, and sign-up mode conditional routing.
- [src/local-types.ts](./src/local-types.md) — TypeScript type definitions for Hono Bindings and context variables.
- [src/renderer.tsx](./src/renderer.md) — JSX renderer middleware for Hono; sets up HTML document shell with Tailwind/DaisyUI styling.
- [src/style.css](./src/style.md) — Tailwind CSS entrypoint and custom styles.
- [src/types.d.ts](./src/types.d.md) — Additional ambient type declarations.
- [src/version.ts](./src/version.md) — Application version string export.

## Constants

- [src/constants.ts](./src/constants.md) — Centralized constants: HTTP status codes, route paths, cookie names/options, sign-up modes, validation patterns/messages, user-facing messages, duration values, retry options, API URLs, security header configs, and log message prefixes.

## Components

- [src/components/gated-sign-up-form.tsx](./src/components/gated-sign-up-form.md) — React/JSX component for the gated sign-up form (single-use code input).

## Database

- [src/db/client.ts](./src/db/client.md) — Drizzle ORM client factory for D1 database.
- [src/db/schema.ts](./src/db/schema.md) — Drizzle schema definitions: user, session, account, verification, singleUseCode, interestedEmail. Includes inferred TypeScript types for all tables.

## Libraries (`src/lib/`)

- [src/lib/auth.ts](./src/lib/auth.md) — Better Auth instance configuration: Drizzle adapter, email/password setup, email verification callbacks, session config, trusted origins, and secret binding.
- [src/lib/cookie-support.ts](./src/lib/cookie-support.md) — Cookie parsing, serialization, and deletion utilities.
- [src/lib/db-helpers.ts](./src/lib/db-helpers.md) — Shared `withRetry` and `toResult` wrappers used by `db/auth-access.ts` and `db/expense-access.ts`.
- [src/lib/db/auth-access.ts](./src/lib/db/auth-access.md) — Auth DB access helpers (retry + Result): `getUserWithAccountByEmail`, `claimSingleUseCode`, `addInterestedEmail`, `deleteUserAccount`.
- [src/lib/db/expense-access.ts](./src/lib/db/expense-access.md) — Expense DB access helpers (retry + Result): `listExpenses` with tag hydration.
- [src/lib/email-service.ts](./src/lib/email-service.md) — Email template builders and sending logic for confirmation and password-reset emails.
- [src/lib/et-date.ts](./src/lib/et-date.md) — `America/New_York` date helpers: `todayEt`, `defaultRangeEt`, `isValidYmd`.
- [src/lib/expense-validators.ts](./src/lib/expense-validators.md) — Per-field validators for the expense entry form; `parseExpenseCreate` collects every field's error and returns parsed cents on success.
- [src/lib/form-state.ts](./src/lib/form-state.md) — Single-use flash payload (`{fieldErrors, values}`) for re-rendering a form on the next GET after a validation-failure redirect.
- [src/lib/generate-code.ts](./src/lib/generate-code.md) — Single-use sign-up code generation utility.
- [src/lib/money.ts](./src/lib/money.md) — Money formatting helpers; provides `formatCents` and `parseAmount` for the expense list and entry form.
- [src/lib/po-notify.ts](./src/lib/po-notify.md) — Pushover notification integration (optional).
- [src/lib/redirects.tsx](./src/lib/redirects.md) — JSX-based redirect response builders.
- [src/lib/send-email.ts](./src/lib/send-email.md) — Low-level email sending via Nodemailer or fetch-based transport.
- [src/lib/setup-no-cache-headers.ts](./src/lib/setup-no-cache-headers.md) — Middleware/util to set cache-busting headers.
- [src/lib/sign-up-utils.ts](./src/lib/sign-up-utils.md) — Shared sign-up validation and processing utilities.
- [src/lib/test-routes.ts](./src/lib/test-routes.md) — Predicate to determine if dev-only test routes should be enabled.
- [src/lib/time-access.ts](./src/lib/time-access.md) — Time-related utilities (clock manipulation for testing).
- [src/lib/url-validation.ts](./src/lib/url-validation.md) — URL validation helpers for redirects and origins.
- [src/lib/validators.ts](./src/lib/validators.md) — Valibot-based input validators (email, password, name, etc.).

## Middleware

- [src/middleware/guard-sign-up-mode.ts](./src/middleware/guard-sign-up-mode.md) — Validates that the current SIGN_UP_MODE environment binding matches the route being accessed; returns 404 for mismatched modes.
- [src/middleware/signed-in-access.ts](./src/middleware/signed-in-access.md) — Protects private routes by requiring an active Better Auth session; redirects unauthenticated users to sign-in.

## Route builders (`src/routes/`)

### Layout and error pages

- [src/routes/build-404.tsx](./src/routes/build-404.md) — 404 page builder (returns HTTP 200 with "Page Not Found" content per project convention).
- [src/routes/build-layout.tsx](./src/routes/build-layout.md) — Shared layout wrapper component for all pages (navbar, footer, flash messages).
- [src/routes/build-root.tsx](./src/routes/build-root.md) — Root `/` page builder (dev-only landing page linking into `/expenses`; PRODUCTION:REMOVE).

### Expense feature pages

All five routes are signed-in-only via the `signedInAccess` middleware. Four are placeholder pages awaiting feature implementation.

- [src/routes/expenses/build-expenses.tsx](./src/routes/expenses/build-expenses.md) — Expense list + entry form page (`/expenses`); GET renders the form (with any flashed per-field errors and sticky values) above the in-window expense table or empty state; POST validates via `parseExpenseCreate` and PRG-redirects on either path.
- [src/routes/build-categories.tsx](./src/routes/build-categories.md) — Categories placeholder page (`/categories`).
- [src/routes/build-tags.tsx](./src/routes/build-tags.md) — Tags placeholder page (`/tags`).
- [src/routes/build-summary.tsx](./src/routes/build-summary.md) — Summary placeholder page (`/summary`).
- [src/routes/build-recurring.tsx](./src/routes/build-recurring.md) — Recurring placeholder page (`/recurring`).

### Auth pages (JSX builders)

- [src/routes/auth/build-await-verification.tsx](./src/routes/auth/build-await-verification.md) — "Await email verification" page.
- [src/routes/auth/build-email-confirmation.tsx](./src/routes/auth/build-email-confirmation.md) — Email confirmation success page.
- [src/routes/auth/build-forgot-password.tsx](./src/routes/auth/build-forgot-password.md) — "Forgot password" request page.
- [src/routes/auth/build-gated-interest-sign-up.tsx](./src/routes/auth/build-gated-interest-sign-up.md) — Combined gated + interest sign-up page.
- [src/routes/auth/build-gated-sign-up.tsx](./src/routes/auth/build-gated-sign-up.md) — Gated sign-up page (requires single-use code).
- [src/routes/auth/build-interest-sign-up.tsx](./src/routes/auth/build-interest-sign-up.md) — Interest/waitlist sign-up page.
- [src/routes/auth/build-reset-password.tsx](./src/routes/auth/build-reset-password.md) — Password reset form page.
- [src/routes/auth/build-sign-in.tsx](./src/routes/auth/build-sign-in.md) — Sign-in page builder.
- [src/routes/auth/build-sign-out.tsx](./src/routes/auth/build-sign-out.md) — Sign-out confirmation page.
- [src/routes/auth/build-sign-up.tsx](./src/routes/auth/build-sign-up.md) — Open sign-up page builder.
- [src/routes/auth/build-waiting-for-reset.tsx](./src/routes/auth/build-waiting-for-reset.md) — "Check your email for reset link" page.

### Auth handlers (API logic)

- [src/routes/auth/better-auth-handler.ts](./src/routes/auth/better-auth-handler.md) — Initializes Better Auth middleware and mounts the /api/auth/\* Better Auth API handler.
- [src/routes/auth/better-auth-response-interceptor.ts](./src/routes/auth/better-auth-response-interceptor.md) — Intercepts Better Auth responses to customize behavior (e.g., redirect on sign-in, flash messages).
- [src/routes/auth/handle-forgot-password.ts](./src/routes/auth/handle-forgot-password.md) — POST handler for initiating password reset; sends reset email via Better Auth.
- [src/routes/auth/handle-gated-interest-sign-up.ts](./src/routes/auth/handle-gated-interest-sign-up.md) — POST handler for combined gated + interest sign-up submissions.
- [src/routes/auth/handle-gated-sign-up.ts](./src/routes/auth/handle-gated-sign-up.md) — POST handler for gated sign-up; validates single-use code.
- [src/routes/auth/handle-interest-sign-up.ts](./src/routes/auth/handle-interest-sign-up.md) — POST handler for interest/waitlist submissions.
- [src/routes/auth/handle-resend-email.ts](./src/routes/auth/handle-resend-email.md) — POST handler to resend verification email with rate limiting.
- [src/routes/auth/handle-reset-clock.ts](./src/routes/auth/handle-reset-clock.md) — Resets manipulated clock (dev-only; PRODUCTION:REMOVE).
- [src/routes/auth/handle-reset-password.ts](./src/routes/auth/handle-reset-password.md) — POST handler for completing password reset with token validation.
- [src/routes/auth/handle-set-clock.ts](./src/routes/auth/handle-set-clock.md) — Manipulates server clock for E2E testing (dev-only; PRODUCTION:REMOVE).
- [src/routes/auth/handle-sign-out.ts](./src/routes/auth/handle-sign-out.md) — POST handler for sign-out; clears session and cookies.
- [src/routes/auth/handle-sign-up.ts](./src/routes/auth/handle-sign-up.md) — POST handler for open sign-up; creates user and sends verification email.

### Profile routes

- [src/routes/profile/build-delete-confirm.tsx](./src/routes/profile/build-delete-confirm.md) — Account deletion confirmation page.
- [src/routes/profile/build-profile.tsx](./src/routes/profile/build-profile.md) — Profile page builder (change password, delete account).
- [src/routes/profile/handle-change-password.ts](./src/routes/profile/handle-change-password.md) — POST handler for changing password.
- [src/routes/profile/handle-delete-account.ts](./src/routes/profile/handle-delete-account.md) — POST handler for account deletion.

### Dev-only test routes (`src/routes/test/`)

- [src/routes/test/database.ts](./src/routes/test/database.md) — Test database manipulation endpoints (PRODUCTION:REMOVE).
- [src/routes/test/sign-up-mode.ts](./src/routes/test/sign-up-mode.md) — Test sign-up mode inspection/override (PRODUCTION:REMOVE).
- [src/routes/test/smtp-config.ts](./src/routes/test/smtp-config.md) — Test SMTP configuration endpoint (PRODUCTION:REMOVE).

### Other handlers

- [src/routes/handle-set-db-failures.ts](./src/routes/handle-set-db-failures.md) — Simulates database failures for resilience testing (dev-only; PRODUCTION:REMOVE).

## Cross-references

- See [e2e-tests.md](e2e-tests.md) for tests covering these routes.
- See [unit-tests.md](unit-tests.md) for isolated tests of `lib/` utilities.
