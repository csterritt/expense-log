# Wiki Index

Content-oriented catalog of all wiki pages for the `expense-log` project.

## Project-level pages

- [Project Overview](project-overview.md) — high-level project description, tech stack, architecture, and security.
- [Wiki Rules](wiki-rules.md) — the LLM Wiki pattern and philosophy.
- [Wiki Agent Schema](AGENTS.md) — schema and conventions for maintaining this wiki.

## Catalogs

- [Source Code](source-code.md) — catalog of all source files under `src/`.
- [E2E Tests](e2e-tests.md) — catalog of all Playwright end-to-end tests under `e2e-tests/`.
- [Unit Tests](unit-tests.md) — catalog of all Bun unit tests under `tests/`.

## Source code pages

### Root

- [index.ts](src/index.md) — Worker entry point; route registration.
- [constants.ts](src/constants.md) — shared constants (paths, cookies, messages, headers).
- [local-types.ts](src/local-types.md) — TypeScript bindings and env types.
- [renderer.tsx](src/renderer.md) — JSX renderer setup.
- [style.css](src/style-css.md) — Tailwind CSS v4 + DaisyUI entry.

### db/

- [client.ts](src/db/client.md) — Drizzle ORM client factory.
- [schema.ts](src/db/schema.md) — Drizzle table definitions.

### lib/

- [auth.ts](src/lib/auth.md) — Better Auth instance factory.
- [confirmation-hmac.ts](src/lib/confirmation-hmac.md) — HMAC token signing/verification.
- [cookie-support.ts](src/lib/cookie-support.md) — cookie helpers.
- [db-helpers.ts](src/lib/db-helpers.md) — DB helper utilities.
- [email-service.ts](src/lib/email-service.md) — email service abstraction.
- [email-utils.ts](src/lib/email-utils.md) — email utility functions.
- [et-date.ts](src/lib/et-date.md) — America/New_York date utilities.
- [expense-validators.ts](src/lib/expense-validators.md) — expense form/filter/summary validators.
- [form-state.ts](src/lib/form-state.md) — cookie-based flash form state.
- [generate-code.ts](src/lib/generate-code.md) — secure token generator.
- [logger.ts](src/lib/logger.md) — structured logging with redaction.
- [money.ts](src/lib/money.md) — money formatting and parsing.
- [po-notify.ts](src/lib/po-notify.md) — Pushover notifications.
- [recurrence.ts](src/lib/recurrence.md) — recurrence date arithmetic.
- [redirects.tsx](src/lib/redirects.md) — redirect helpers with flash cookies.
- [send-email.ts](src/lib/send-email.md) — SMTP email sending with retry.
- [setup-no-cache-headers.ts](src/lib/setup-no-cache-headers.md) — no-cache header setter.
- [sign-up-utils.ts](src/lib/sign-up-utils.md) — gated sign-up utilities.
- [test-routes.ts](src/lib/test-routes.md) — test route enablement check.
- [time-access.ts](src/lib/time-access.md) — time management with test delta.
- [url-validation.ts](src/lib/url-validation.md) — open redirect prevention.
- [validators.ts](src/lib/validators.md) — auth form Valibot schemas.

### lib/db/

- [auth-access.ts](src/lib/db/auth-access.md) — auth DB access.
- [category-access.ts](src/lib/db/category-access.md) — category DB access.
- [confirm-helpers.ts](src/lib/db/confirm-helpers.md) — shared confirm pipeline.
- [expense-access.ts](src/lib/db/expense-access.md) — expense and recurring DB access.
- [summary-access.ts](src/lib/db/summary-access.md) — summary aggregation DB access.
- [tag-access.ts](src/lib/db/tag-access.md) — tag DB access.

### middleware/

- [guard-sign-up-mode.ts](src/middleware/guard-sign-up-mode.md) — sign-up mode guard middleware.
- [signed-in-access.ts](src/middleware/signed-in-access.md) — auth-required middleware.

### components/

- [gated-sign-up-form.tsx](src/components/gated-sign-up-form.md) — gated sign-up form component.
- [tag-chip-checkboxes.tsx](src/components/tag-chip-checkboxes.md) — tag chip checkbox component.

### routes/

- [build-404.tsx](src/routes/build-404.md) — 404 page.
- [build-categories.tsx](src/routes/build-categories.md) — category management page.
- [build-layout.tsx](src/routes/build-layout.md) — shared HTML layout.
- [build-recurring.tsx](src/routes/build-recurring.md) — recurring list page.
- [build-root.tsx](src/routes/build-root.md) — root redirect route.
- [build-summary.tsx](src/routes/build-summary.md) — summary page.
- [build-tags.tsx](src/routes/build-tags.md) — tag management page.
- [handle-set-db-failures.ts](src/routes/handle-set-db-failures.md) — DB failure test route.

### routes/auth/

- [better-auth-handler.ts](src/routes/auth/better-auth-handler.md) — Better Auth API handler and session middleware.
- [better-auth-response-interceptor.ts](src/routes/auth/better-auth-response-interceptor.md) — Better Auth response interceptor.
- [build-await-verification.tsx](src/routes/auth/build-await-verification.md) — await verification page.
- [build-email-confirmation.tsx](src/routes/auth/build-email-confirmation.md) — email verification pages.
- [build-forgot-password.tsx](src/routes/auth/build-forgot-password.md) — forgot password page.
- [build-gated-interest-sign-up.tsx](src/routes/auth/build-gated-interest-sign-up.md) — gated interest sign-up page.
- [build-gated-sign-up.tsx](src/routes/auth/build-gated-sign-up.md) — gated sign-up page.
- [build-interest-sign-up.tsx](src/routes/auth/build-interest-sign-up.md) — interest sign-up page.
- [build-reset-password.tsx](src/routes/auth/build-reset-password.md) — reset password page.
- [build-sign-in.tsx](src/routes/auth/build-sign-in.md) — sign-in page.
- [build-sign-out.tsx](src/routes/auth/build-sign-out.md) — sign-out success page.
- [build-sign-up.tsx](src/routes/auth/build-sign-up.md) — sign-up page.
- [build-waiting-for-reset.tsx](src/routes/auth/build-waiting-for-reset.md) — waiting for reset page.
- [handle-forgot-password.ts](src/routes/auth/handle-forgot-password.md) — forgot password POST handler.
- [handle-gated-interest-sign-up.ts](src/routes/auth/handle-gated-interest-sign-up.md) — gated interest sign-up POST handler.
- [handle-gated-sign-up.ts](src/routes/auth/handle-gated-sign-up.md) — gated sign-up POST handler.
- [handle-interest-sign-up.ts](src/routes/auth/handle-interest-sign-up.md) — interest sign-up POST handler.
- [handle-resend-email.ts](src/routes/auth/handle-resend-email.md) — resend email POST handler.
- [handle-reset-clock.ts](src/routes/auth/handle-reset-clock.md) — reset clock test route.
- [handle-reset-password.ts](src/routes/auth/handle-reset-password.md) — reset password POST handler.
- [handle-set-clock.ts](src/routes/auth/handle-set-clock.md) — set clock test route.
- [handle-sign-out.ts](src/routes/auth/handle-sign-out.md) — sign-out POST handler.
- [handle-sign-up.ts](src/routes/auth/handle-sign-up.md) — sign-up POST handler.

### routes/expenses/

- [build-edit-expense.tsx](src/routes/expenses/build-edit-expense.md) — expense edit/delete routes.
- [build-expenses.tsx](src/routes/expenses/build-expenses.md) — expense list route registration.
- [expense-confirm-post-handler.ts](src/routes/expenses/expense-confirm-post-handler.md) — confirm-create-new handler.
- [expense-form-helpers.ts](src/routes/expenses/expense-form-helpers.md) — form helpers.
- [expense-form.tsx](src/routes/expenses/expense-form.md) — shared expense form renderer.
- [expense-get-handler.ts](src/routes/expenses/expense-get-handler.md) — expenses GET handler.
- [expense-list-renderer.tsx](src/routes/expenses/expense-list-renderer.md) — list page renderers.
- [expense-post-handler.ts](src/routes/expenses/expense-post-handler.md) — expense create POST handler.

### routes/profile/

- [build-profile.tsx](src/routes/profile/build-profile.md) — profile page.
- [build-delete-confirm.tsx](src/routes/profile/build-delete-confirm.md) — delete account confirmation.
- [handle-change-password.ts](src/routes/profile/handle-change-password.md) — change password handler.
- [handle-delete-account.ts](src/routes/profile/handle-delete-account.md) — delete account handler.

### routes/recurring/

- [build-create-recurring.tsx](src/routes/recurring/build-create-recurring.md) — recurring create routes.
- [build-edit-recurring.tsx](src/routes/recurring/build-edit-recurring.md) — recurring edit/delete routes.
- [recurring-form.tsx](src/routes/recurring/recurring-form.md) — recurring form renderer.

### routes/test/

- [database.ts](src/routes/test/database.md) — DB test route.
- [run-cron.ts](src/routes/test/run-cron.md) — cron trigger test route.
- [sign-up-mode.ts](src/routes/test/sign-up-mode.md) — sign-up mode test route.
- [smtp-config.ts](src/routes/test/smtp-config.md) — SMTP config test route.

## Public JS pages

- [category-combobox.js](public/js/category-combobox.md) — progressive-enhancement category combobox.
- [tag-chip-checkboxes.js](public/js/tag-chip-checkboxes.md) — progressive-enhancement tag chip checkboxes.

## E2E test pages

See [E2E Tests catalog](e2e-tests.md) for the full list of 44+ spec files organized by feature area.

## Unit test pages

See [Unit Tests catalog](unit-tests.md) for the full list of 18 spec files.
