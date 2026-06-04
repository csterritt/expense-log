# Source Code Catalog

Catalog of all source files under `src/`, organized by category. Each file links to its individual wiki page.

## Core application

- [src/index.ts](./src/index.md) — Hono app setup, middleware chain, route registration, environment variable validation, and sign-up mode conditional routing. Issue 15: default export changed from `app` to `{ fetch: app.fetch, scheduled }` to carry both the fetch and cron handlers.
- [src/scheduled.ts](./src/scheduled.md) — Issue 15: Cloudflare Workers scheduled handler. Builds DB client, calls `materializeRecurring(todayEt())`, logs the outcome, and sends a Pushover notification via `pushoverNotifyEnv` on failure. Exports `scheduled` (production entry point) and `createScheduled(deps)` (factory for unit testing via dep injection).
- [src/local-types.ts](./src/local-types.md) — TypeScript type definitions for Hono Bindings and context variables.
- [src/renderer.tsx](./src/renderer.md) — JSX renderer middleware for Hono; sets up HTML document shell with Tailwind/DaisyUI styling.
- [src/style.css](./src/style.md) — Tailwind CSS entrypoint and custom styles.
- [src/types.d.ts](./src/types.d.md) — Additional ambient type declarations.
- [src/version.ts](./src/version.md) — Application version string export.

## Constants

- [src/constants.ts](./src/constants.md) — Centralized constants: HTTP status codes, route paths, cookie names/options, sign-up modes, validation patterns/messages, user-facing messages, duration values, retry options, API URLs, security header configs, and log message prefixes.

## Components

- [src/components/gated-sign-up-form.tsx](./src/components/gated-sign-up-form.md) — React/JSX component for the gated sign-up form (single-use code input).
- [src/components/tag-chip-checkboxes.tsx](./src/components/tag-chip-checkboxes.md) — Shared tag chip-checkbox component for mutation forms and filter forms. Renders native server-rendered checkboxes as DaisyUI badge chips, sorted alphabetically (case-insensitive). Supports `allowNewTags` mode with an adjacent `newTags` text input. Exports `CHIP_CLASS_BASE` and `CHIP_CLASS_SELECTED` constants consumed by the progressive-enhancement JS module.

## Database

- [src/db/client.ts](./src/db/client.md) — Drizzle ORM client factory for D1 database.
- [src/db/schema.ts](./src/db/schema.md) — Drizzle schema definitions for auth and expense-tracking tables. Category names now use a unique `lower(name)` index for case-insensitive uniqueness while preserving `expense`/`recurring` category FK restrictions.

## Libraries (`src/lib/`)

- [src/lib/auth.ts](./src/lib/auth.md) — Better Auth instance configuration: Drizzle adapter, email/password setup, email verification callbacks, session config, trusted origins, and secret binding.
- [src/lib/cookie-support.ts](./src/lib/cookie-support.md) — Cookie parsing, serialization, and deletion utilities.
- [src/lib/db-helpers.ts](./src/lib/db-helpers.md) — Shared `withRetry` and `toResult` wrappers used by `db/auth-access.ts` and `db/expense-access.ts`.
- [src/lib/recurrence.ts](./src/lib/recurrence.md) — Issue 14: Pure calendar arithmetic for recurring expenses. `nextOccurrenceAfter(after, recurrence, anchorDate)` computes the next YYYY-MM-DD strictly after a given date with 28th-shift clamping for Monthly/Quarterly/Yearly. `occurrencesToGenerate(params)` enumerates all undone occurrences between `createdAt`/`lastOccurrence` and `today` using the first-occurrence rule.
- [src/lib/confirmation-hmac.ts](./src/lib/confirmation-hmac.md) — HMAC-SHA-256 signing utilities for expense and recurring confirmation payloads. Exports `ConfirmationPayload`, `RecurringConfirmationPayload`, `signConfirmationPayload`, `verifyConfirmationPayload`, `signRecurringConfirmationPayload`, and `verifyRecurringConfirmationPayload`. Fail-closed verification with constant-time comparison.
- [src/lib/db/auth-access.ts](./src/lib/db/auth-access.md) — Auth DB access helpers (retry + Result): `getUserWithAccountByEmail`, `claimSingleUseCode`, `addInterestedEmail`, `deleteUserAccount`.
- [src/lib/db/confirm-helpers.ts](./src/lib/db/confirm-helpers.md) — Race-tolerant create-or-reuse helpers for confirmation handlers: `createOrReuseTag`, `createOrReuseCategory`, and shared `resolveConfirmTagsAndCategory` pipeline. Returns discriminated unions for tag-list, tag-input, category-lookup, and new-category-name errors.
- [src/lib/db/expense-access.ts](./src/lib/db/expense-access.md) — Expense/category/tag DB access helpers (retry + Result): list/read/create/update/delete expense flows plus Issue 09 category management helpers. Issue 11: `ListExpenseFilters` now accepts optional `from`, `to`, `description`, `categoryId`, `tagIds`, and `tagMode` ('or'|'and') — all fields optional; no filters returns all rows; default 2-month window is applied at the route layer. Issue 14: `ExpenseRow` gains `recurringId: string | null`; `listExpensesActual` selects and returns `recurringId`; adds `materializeOneRecurring(db, template, today)` (idempotent single-template insert using `ON CONFLICT DO NOTHING` via a unique partial index on `(recurringId, occurrenceDate)`) and `materializeRecurring(db, today)` (public aggregator returning `{ generated, skipped, failed }`; error-isolates per-template failures).
- [src/lib/db/category-access.ts](./src/lib/db/category-access.md) — Category DB access helpers (retry + Result): `listCategories`, `findCategoryByName`, `createCategory`, `renameCategory`, `mergeCategory`, `deleteCategory`, `countCategoryExpenses`. Case-insensitive lookups and duplicate protection.
- [src/lib/db/tag-access.ts](./src/lib/db/tag-access.md) — Tag DB access helpers (retry + Result): `listTags`, `findTagsByNames`, `createTag`, `renameTag`, `mergeTag`, `deleteTag`, `countTagExpenses`. Case-insensitive lookups and collision-aware merge logic for both `expenseTag` and `recurringTag` tables.
- [src/lib/db/summary-access.ts](./src/lib/db/summary-access.md) — Issue 17: `summarize(db, opts)` for expense aggregation by dimension (`time`, `category`, `tag`, `category-tag`), granularity (`month`, `quarter`, `year`), tag-AND filtering, and explicit sorting. Uses `withRetry` + `Result` pattern.
- [src/lib/email-service.ts](./src/lib/email-service.md) — Email template builders and sending logic for confirmation and password-reset emails.
- [src/lib/et-date.ts](./src/lib/et-date.md) — `America/New_York` date helpers: `todayEt`, `defaultRangeEt`, `isValidYmd`. Issue 17 adds `monthKeyEt`, `quarterKeyEt`, `yearKeyEt` for summary time-period labels.
- [src/lib/expense-validators.ts](./src/lib/expense-validators.md) — Per-field validators for expense entry/edit plus category and tag management. Issue 11 adds `parseExpenseListFilters(raw)`. Issue 13 adds `parseRecurringCreate(values: RecurringFormValues)` → `Result<ParsedRecurringCreate, FieldErrors>`, along with `RecurrenceSchema`, `AnchorDateSchema`, `VALID_RECURRENCES`, `Recurrence`, `RecurringFormValues`, and `ParsedRecurringCreate`. `FieldErrors` gains optional `recurrence` and `anchorDate` keys. Issue 16: `parseExpenseListFilters` gains a `from <= to` ordering check — when both dates are present and valid, `from > to` sets `fieldErrors.date`. Issue 17 re-introduces `parseSummaryQuery(raw)` with four dimensions, three granularities, tag-AND filtering, and sort validation.
- [src/lib/form-state.ts](./src/lib/form-state.md) — Single-use flash payload (`{fieldErrors, values}`) for re-rendering expense/category forms on the next GET after a validation-failure redirect. Issue 13: `ExpenseFormValues` gains optional `recurrence` and `anchorDate` fields to round-trip recurring-template form values through the flash cookie.
- [src/lib/generate-code.ts](./src/lib/generate-code.md) — Single-use sign-up code generation utility.
- [src/lib/money.ts](./src/lib/money.md) — Money formatting helpers: `formatCents` (comma-formatted), `formatCentsPlain` (plain decimal, used to pre-populate edit form fields), and `parseAmount`.
- [src/lib/po-notify.ts](./src/lib/po-notify.md) — Pushover notification integration (optional). Issue 15: added `pushoverNotifyEnv(env: Bindings, message)` (context-free, callable from scheduled handler); `pushoverNotify(c, message)` now delegates to it — no behaviour change for existing callers.
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

All routes are signed-in-only via the `signedInAccess` middleware. `/summary` was reduced to a placeholder in 2026-05-22 after the full Issue 12 implementation was removed, then re-implemented in Issue 17 with a redesigned aggregation UI. `/recurring` and its sub-routes were implemented in Issue 13.

- [src/routes/expenses/build-expenses.tsx](./src/routes/expenses/build-expenses.md) — Route builder for the expenses list page. Refactored in Issue 14B to be a thin orchestrator that delegates to separate handler modules. Registers GET `/expenses` (via `handleExpensesGet`), POST `/expenses` (via `handleExpensesPost`), and POST `/expenses/confirm-create-new` (via `handleExpensesConfirmPost`). All routes use `secureHeaders` and `signedInAccess` middleware.
- [src/routes/expenses/expense-list-renderer.tsx](./src/routes/expenses/expense-list-renderer.md) — Render functions for the expenses list page. Exports `renderFilterBar`, `renderExpenseTable`, and `renderExpenses` for the filter bar, expense table, and complete page layout respectively. Extracted from `build-expenses.tsx` in Issue 14B. Issue 14: expense description cell renders an underlined `<span>` and a `↻` badge (`data-testid="expense-row-recurring-badge"`) when `recurringId` is non-null.
- [src/routes/expenses/expense-form-helpers.ts](./src/routes/expenses/expense-form-helpers.md) — Helper functions for expense form handling. Exports `emptyState` (creates default form state) and `readRawBody` (parses request body). Extracted from `build-expenses.tsx` in Issue 14B.
- [src/routes/expenses/expense-get-handler.ts](./src/routes/expenses/expense-get-handler.md) — GET handler for `/expenses`. Parses query-string filters, loads expenses/categories/tags, applies default 2-month window on first load, and renders the page. Extracted from `build-expenses.tsx` in Issue 14B.
- [src/routes/expenses/expense-post-handler.ts](./src/routes/expenses/expense-post-handler.md) — POST handler for `/expenses`. Validates expense data, parses tags, looks up existing categories/tags, detects new items, and either creates the expense directly or renders a confirmation page. Extracted from `build-expenses.tsx` in Issue 14B.
- [src/routes/expenses/expense-confirm-post-handler.ts](./src/routes/expenses/expense-confirm-post-handler.md) — POST handler for `/expenses/confirm-create-new`. Handles cancel action, defensive re-validation, and atomic creation of new categories/tags/expense. Extracted from `build-expenses.tsx` in Issue 14B.
- [src/routes/expenses/build-edit-expense.tsx](./src/routes/expenses/build-edit-expense.md) — Edit + delete flow (Issue 08): `GET /expenses/:id/edit`, `POST /expenses/:id/edit`, `POST /expenses/:id/confirm-edit-new`, `GET /expenses/:id/delete`, `POST /expenses/:id/delete`.
- [src/routes/expenses/expense-form.tsx](./src/routes/expenses/expense-form.md) — Shared entry/edit form renderer + shared *Confirm new items* page renderer (Issue 08). Issue 13: `ConfirmNewItemsProps` gains optional `entity: 'expense' | 'recurring'` prop; when `entity='recurring'` the page uses `confirm-recurring-{create,edit}-new-*` testid prefixes, shows recurrence/anchor-date in the preview, and carries `recurrence`/`anchorDate` hidden inputs instead of `date`.
- [src/routes/build-categories.tsx](./src/routes/build-categories.md) — Signed-in category management page (`/categories`) with create, rename, merge-on-collision confirmation, and delete flows.
- [src/routes/build-tags.tsx](./src/routes/build-tags.md) — Signed-in tag management page (`/tags`) with create, rename, merge-on-collision confirmation, and delete flows (Issue 10, mirrors category management from Issue 09).
- [src/routes/build-summary.tsx](./src/routes/build-summary.md) — Issue 17: Full summary aggregation page (`/summary`). Supports four dimensions, three granularities, tag-AND filtering, sortable columns, and clear-reset. No grand total or percent-of-total rows.
- [src/routes/build-recurring.tsx](./src/routes/build-recurring.md) — Issue 13: Real recurring-templates list page (`GET /recurring`). Calls `listRecurring`, renders DaisyUI table with Description, Amount, Category, Tags, Recurrence, Anchor date, and Next occurrence columns. Next occurrence is computed via `nextOccurrenceAfter`; Quarterly/Yearly fall back to `—` until Issue 14. `data-testid="recurring-page"`, `recurring-row`, `recurring-new`.
- [src/routes/recurring/recurring-form.tsx](./src/routes/recurring/recurring-form.md) — Issue 13: Shared recurring-template entry/edit form renderer. Exports `renderRecurringForm({ mode, action, state, payloads })` with description, amount, category (combobox), recurrence (select), anchor date (date input), and tags (chip picker). Testids: `recurring-form`, `recurring-form-create` / `recurring-form-save`.
- [src/routes/recurring/build-create-recurring.tsx](./src/routes/recurring/build-create-recurring.md) — Issue 13: Create flow for recurring templates. Registers `GET /recurring/new`, `POST /recurring`, and `POST /recurring/confirm-create-new`. Mirrors the expense create flow: validates via `parseRecurringCreate`, resolves category/tags, routes through `renderConfirmNewItems(entity='recurring')` when new items are needed, then calls `createRecurringWithTags` or `createManyAndRecurring`.
- [src/routes/recurring/build-edit-recurring.tsx](./src/routes/recurring/build-edit-recurring.md) — Issue 13: Edit and delete flows for recurring templates. Registers `GET /recurring/:id/edit`, `POST /recurring/:id/edit`, `POST /recurring/:id/confirm-edit-new`, `GET /recurring/:id/delete`, and `POST /recurring/:id/delete`. Pre-populates edit form with `formatCentsPlain`. Delete confirmation page uses `confirm-delete-recurring-*` testids; delete POST calls `deleteRecurring` then redirects to list.

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

- [src/routes/test/database.ts](./src/routes/test/database.md) — Test database manipulation endpoints (PRODUCTION:REMOVE). Issue 14: `POST /test/database/seed-recurring-templates` accepts optional `createdAtIso` per-row to override the default `new Date()` creation timestamp, enabling clock-controlled e2e tests.
- [src/routes/test/run-cron.ts](./src/routes/test/run-cron.md) — Issue 14: Dev-only `POST /test/run-cron` that invokes `materializeRecurring` with `todayEt(getCurrentTime(c))` and returns a JSON summary. Guarded by `signedInAccess` and `isTestRouteEnabled` (PRODUCTION:REMOVE).
- [src/routes/test/sign-up-mode.ts](./src/routes/test/sign-up-mode.md) — Test sign-up mode inspection/override (PRODUCTION:REMOVE).
- [src/routes/test/smtp-config.ts](./src/routes/test/smtp-config.md) — Test SMTP configuration endpoint (PRODUCTION:REMOVE).

### Other handlers

- [src/routes/handle-set-db-failures.ts](./src/routes/handle-set-db-failures.md) — Simulates database failures for resilience testing (dev-only; PRODUCTION:REMOVE).

## Cross-references

- See [e2e-tests.md](e2e-tests.md) for tests covering these routes.
- See [unit-tests.md](unit-tests.md) for isolated tests of `lib/` utilities.
