# Project Overview

## Summary

Expense Log is a Cloudflare Worker expense-tracking application with built-in authentication. Signed-in users can log expenses, organize them with categories and tags, filter and search the list, view summary breakdowns, and define recurring expense templates that auto-generate entries on a schedule.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Web framework**: [Hono](https://hono.dev/) — routing, middleware, JSX rendering
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) with SQLite (D1)
- **Auth**: [Better Auth](https://better-auth.com/) — email/password, session management, email verification, password reset
- **Validation**: [Valibot](https://valibot.dev/) — schema-based form validation
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4 + [DaisyUI](https://daisyui.com/) v5
- **Email**: [Nodemailer](https://nodemailer.com/) via SMTP for transactional emails (OTP, password reset)
- **Notifications**: [Pushover](https://pushover.net/) for admin alerts
- **Result types**: [true-myth](https://true-myth.js.org/) `Result` for error handling
- **IDs**: [ULID](https://github.com/ulid/javascript) for sortable unique identifiers
- **Testing**: [Playwright](https://playwright.dev/) for E2E, [Bun test](https://bun.sh/docs/cli/test) for unit tests
- **Build**: Wrangler CLI for Cloudflare Workers

## Architecture

### Request flow

1. Cloudflare Worker receives HTTP request.
2. Hono router matches route, applies middleware (`signedInAccess`, `guard-sign-up-mode`, secure headers).
3. Better Auth middleware enriches context with session/user data.
4. Route handler reads from / writes to D1 via Drizzle ORM.
5. Response rendered as server-side JSX (Hono's `c.render()` + `useLayout`).
6. Redirects use cookies for flash messages and form-state preservation.

### Key directories

- `src/` — application source code
  - `src/index.ts` — Worker entry point, route registration
  - `src/constants.ts` — shared constants (paths, cookies, messages, headers)
  - `src/local-types.ts` — TypeScript bindings and env types
  - `src/renderer.tsx` — JSX renderer setup
  - `src/style.css` — Tailwind/DaisyUI entry
  - `src/db/` — Drizzle client and schema definitions
  - `src/lib/` — business logic, utilities, DB access layer
  - `src/lib/db/` — data access modules (expenses, categories, tags, auth, summary)
  - `src/middleware/` — Hono middleware (auth guard, sign-up mode guard)
  - `src/components/` — shared JSX components
  - `src/routes/` — route builders organized by feature area
  - `src/routes/auth/` — authentication routes (sign-in, sign-up, password reset, email verification)
  - `src/routes/expenses/` — expense CRUD routes (list, create, edit, delete)
  - `src/routes/recurring/` — recurring template CRUD routes
  - `src/routes/profile/` — user profile, change password, delete account
  - `src/routes/test/` — test-only debug routes (disabled in production)
- `public/` — static assets served directly
  - `public/js/` — progressive-enhancement vanilla JS (category combobox, tag chip checkboxes)
- `tests/` — unit tests (Bun test runner)
- `e2e-tests/` — Playwright end-to-end tests
- `drizzle/` — database migration SQL files

### Authentication

Better Auth handles email/password sign-up, sign-in, session cookies, email verification, and password reset. The app supports multiple sign-up modes controlled by the `SIGN_UP_MODE` environment variable: `open`, `gated`, `interest`, `none`, `both`. Gated sign-up requires an invite code. The `guard-sign-up-mode` middleware enforces which routes are accessible in each mode.

### Data model

- **users** — Better Auth managed user accounts
- **sessions** — Better Auth managed sessions
- **expenses** — individual expense entries (description, amount in cents, date, category, recurring link)
- **categories** — expense categories (name, unique)
- **tags** — expense tags (name, unique)
- **expense_tags** — many-to-many join between expenses and tags
- **recurring_templates** — recurring expense definitions (recurrence rule, anchor date, amount, category)
- **recurring_tags** — many-to-many join between recurring templates and tags
- **invite_codes** — gated sign-up invite codes
- **interest_signups** — waitlist entries for interest sign-up mode

### Form handling pattern

The app uses a PRG (Post-Redirect-Get) pattern with cookie-based flash state:

1. POST handler validates input, performs DB operations.
2. On success: redirect with `COOKIES.MESSAGE_FOUND` cookie.
3. On validation error: redirect with `COOKIES.FORM_ERRORS` cookie containing field errors + sticky values.
4. GET handler reads and clears flash cookies, re-renders form with errors and preserved values.

### Progressive enhancement

The category input and tag selector work as plain HTML form fields without JavaScript. Two vanilla JS files enhance the UX:

- `category-combobox.js` — transforms category text input into an ARIA-compliant combobox with filtering and "Create new" option.
- `tag-chip-checkboxes.js` — reflects checkbox state as visual chip toggles and shows optimistic preview chips for new tags being typed.

Both scripts are self-contained IIFEs with no dependencies, loaded via `<script defer>` tags.

### Recurring expenses

Recurring templates define a recurrence rule (Monthly, Quarterly, Yearly) and an anchor date. A scheduled cron job (Cloudflare Workers Cron Trigger) runs `occurrencesToGenerate` to materialize due expense entries from templates. The `recurrence.ts` module handles date arithmetic with day-of-month clamping.

### Security

- Secure headers on all routes (`Cache-Control`, `X-Content-Type-Options`, etc.)
- No-cache headers on authenticated pages
- Open redirect prevention via `validateCallbackUrl`
- Rate limiting on password reset and email resend endpoints
- HMAC-signed confirmation tokens
- Sensitive data redaction in logs via `sanitizeError`
- Safe JSON serialization in script tags (`safeJsonForScript`)
- `setAttribute` allow-list in client-side JS (no `innerHTML`)

## Configuration

- `wrangler.jsonc` — Cloudflare Worker config (bindings, cron triggers, D1 database)
- `drizzle.config.ts` — Drizzle Kit migration config
- `tailwind.config.js` — Tailwind CSS config
- `playwright.config.ts` — Playwright test config
- `tsconfig.json` — TypeScript config
- `.dev.vars.all.template` — template for local environment variables

## Scripts

- `npm run dev-*` — start dev server in various sign-up modes
- `npm run build` — build with Wrangler
- `npm run deploy` — deploy to Cloudflare
- `npm test` — run unit tests with Bun
- `npm run test:e2e` — run Playwright E2E tests
- `npm run fmt` / `npm run fmt:check` — format with oxfmt
