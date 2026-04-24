# Project Overview

`expense-log` is a Cloudflare Worker-based personal expense-tracking application with built-in authentication and multiple sign-up modes.

## Purpose

Forked from the `daisy-tw-worker-d1-drizzle` auth template, this project layers an expense-logging feature on top: signed-in users can record expenses, organize them with categories and tags, view summaries, and define recurring expense templates. Authentication retains username/password sign-in with email verification, password reset, and configurable sign-up gating. Deployed as a Cloudflare Worker with a D1 SQLite database.

## Technology stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/) v4.12.9
- **Database**: Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team/) v0.45.1
- **Auth library**: [Better Auth](https://www.better-auth.com/) v1.5.6
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4.2.2 + [DaisyUI](https://daisyui.com/) v5.5.19
- **Validation**: [Valibot](https://valibot.dev/) v1.3.1
- **Email**: Nodemailer v8.0.4
- **Testing**: Playwright v1.58.2 (E2E), bun test (unit)
- **Build**: Wrangler v4.77.0, TypeScript v6.0.2

## Architecture

### Sign-up modes

The app runs in one of four modes controlled by the `SIGN_UP_MODE` environment variable:

1. `NO_SIGN_UP` — No sign up allowed.
2. `OPEN_SIGN_UP` — Anyone can sign up; email verification required.
3. `GATED_SIGN_UP` — Sign up allowed only with a single-use sign-up code.
4. `INTEREST_SIGN_UP` — Sign up not allowed; users can join a waitlist by submitting their email.
5. `BOTH_SIGN_UP` — Combines gated and interest sign-up.

### Key directories

- `src/` — Application source code.
  - `db/` — Drizzle schema and database client.
  - `lib/` — Shared utilities (auth, email, validation, etc.).
  - `middleware/` — Hono middleware (sign-up mode guard, signed-in access).
  - `routes/` — Route builders (`build-*.tsx`) and handlers (`handle-*.ts`).
    - `auth/` — Authentication-related routes and handlers.
    - `profile/` — Profile and account management routes.
    - `expenses/` — Expense list page builder.
    - `test/` — Dev-only test endpoints (PRODUCTION:REMOVE).
    - Top-level placeholder builders for `categories`, `tags`, `summary`, and `recurring` pages.
- `e2e-tests/` — Playwright end-to-end tests organized by feature.
- `tests/` — Unit tests for isolated utilities.

### Security

- CSRF protection via Hono's `csrf` middleware.
- Secure headers configured via Hono's `secureHeaders` middleware.
- Body size limiting (1KB in dev, 4KB in production).
- Email verification required before sign-in.
- Password reset via time-limited token emails.
- Dev-only routes and test endpoints are marked with `// PRODUCTION:REMOVE` comments and removed by `clean-for-production.rb` during deployment.

### Expense feature

Five signed-in-only routes form the expense feature scaffold. Each is rendered through `useLayout` and protected by the `signedInAccess` middleware:

- `GET /expenses` — list page (currently shows an `expenses-empty-state` placeholder).
- `GET /categories` — placeholder "Categories" page.
- `GET /tags` — placeholder "Tags" page.
- `GET /summary` — placeholder "Summary" page.
- `GET /recurring` — placeholder "Recurring" page.

The header navbar exposes `expenses-nav`, `categories-nav`, `tags-nav`, `summary-nav`, and `recurring-nav` links when the user is authenticated. The previous `/private` route and its `buildPrivate` builder were removed; `/expenses` is now the post-sign-in landing page.

The Drizzle schema adds tables for `category`, `tag`, `expense`, `expenseTag`, `recurring`, and `recurringTag`, including a unique partial index `expense_recurring_occurrence_unique` on `(recurringId, occurrenceDate)` (where `recurringId IS NOT NULL`).

### Notable design decisions

- **Static root page**: The only JavaScript served to clients is in `buildRoot.tsx` (for sign-out message display). The root `index.html` is built and placed in `/public` so Cloudflare serves it statically without invoking a Worker.
- **Test helpers**: Extensive Playwright helper modules under `e2e-tests/support/` provide database isolation, navigation, form interaction, and verification utilities.
- **Dev-only test endpoints**: `/test/database`, `/test/sign-up-mode`, `/test/smtp-config`, and clock-manipulation routes exist only in development/testing to facilitate E2E test scenarios.

## Environment variables

Required at runtime:

- `BETTER_AUTH_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_DATABASE_ID`
- `CLOUDFLARE_D1_TOKEN`
- `SIGN_UP_MODE`
- `EMAIL_SEND_URL`
- `EMAIL_SEND_CODE`

Optional:

- `ALTERNATE_ORIGIN` — For dev CSRF origin matching.
- `PO_APP_ID` / `PO_USER_ID` — Pushover notifications.
- `ENABLE_TEST_ROUTES` / `PLAYWRIGHT` — Enable dev-only test routes.

## Related pages

- [source-code.md](source-code.md) — Detailed catalog of source files.
- [e2e-tests.md](e2e-tests.md) — Detailed catalog of end-to-end tests.
- [unit-tests.md](unit-tests.md) — Detailed catalog of unit tests.
