# Source Code Catalog

Catalog of all source files under `src/`. Each entry links to its detailed wiki page.

## Root

| File | Summary |
|------|---------|
| [index.ts](src/index.md) | Worker entry point; registers all route builders, middleware, and cron trigger. |
| [constants.ts](src/constants.md) | Shared constants: PATHS, COOKIES, MESSAGES, HTTP status, secure header presets. |
| [local-types.ts](src/local-types.md) | TypeScript type definitions for Bindings, AuthUser, DrizzleClient, and env vars. |
| [renderer.tsx](src/renderer.md) | Hono JSX renderer setup with custom layout and HTML shell. |
| [style.css](src/style-css.md) | Tailwind CSS v4 + DaisyUI entry with font theme definitions. |

## db/

| File | Summary |
|------|---------|
| [client.ts](src/db/client.md) | Drizzle ORM client factory; creates a Drizzle instance from a D1 binding. |
| [schema.ts](src/db/schema.md) | Drizzle table definitions for expenses, categories, tags, recurring templates, join tables, invite codes, interest signups. |

## lib/

| File | Summary |
|------|---------|
| [auth.ts](src/lib/auth.md) | Better Auth instance factory; configures email/password, session, verification, and SMTP. |
| [confirmation-hmac.ts](src/lib/confirmation-hmac.md) | HMAC signing and verification for confirmation tokens. |
| [cookie-support.ts](src/lib/cookie-support.md) | Cookie helpers: addCookie, removeCookie, getCookie with consistent attributes. |
| [db-helpers.ts](src/lib/db-helpers.md) | Generic DB helper utilities (retry logic, transaction wrappers). |
| [email-service.ts](src/lib/email-service.md) | Email service abstraction for sending transactional emails. |
| [email-utils.ts](src/lib/email-utils.md) | Email utility functions (template rendering, address formatting). |
| [et-date.ts](src/lib/et-date.md) | America/New_York date utilities: todayEt, defaultRangeEt, month/quarter labels, chronological keys. |
| [expense-validators.ts](src/lib/expense-validators.md) | Valibot schemas and parsers for expense forms, filters, summary queries, tag inputs, category names. |
| [form-state.ts](src/lib/form-state.md) | Cookie-based flash form state: redirectWithFormErrors, readAndClearFormState, ExpenseFormValues. |
| [generate-code.ts](src/lib/generate-code.md) | Cryptographically secure 8-character alphanumeric token generator. |
| [logger.ts](src/lib/logger.md) | Structured JSON logging (logInfo, logError, logWarn) with sensitive data redaction. |
| [money.ts](src/lib/money.md) | Money utilities: formatCents, formatCentsPlain, parseAmount (cents from user input). |
| [po-notify.ts](src/lib/po-notify.md) | Pushover notification integration; sends admin alerts in non-dev environments. |
| [recurrence.ts](src/lib/recurrence.md) | Recurrence date arithmetic: nextOccurrenceAfter, occurrencesToGenerate for Monthly/Quarterly/Yearly. |
| [redirects.tsx](src/lib/redirects.md) | Redirect helpers with flash cookies: redirectWithMessage, redirectWithError. |
| [send-email.ts](src/lib/send-email.md) | SMTP email sending via Nodemailer; sendEmail, sendOtpToUserViaEmail with retry logic. |
| [setup-no-cache-headers.ts](src/lib/setup-no-cache-headers.md) | Sets Cache-Control/Pragma/Expires headers to prevent caching on authenticated pages. |
| [sign-up-utils.ts](src/lib/sign-up-utils.md) | Gated sign-up utilities: code claiming, duplicate detection, error handling, processGatedSignUp. |
| [test-routes.ts](src/lib/test-routes.md) | Determines if test/debug routes are enabled based on environment variables. |
| [time-access.ts](src/lib/time-access.md) | Time management with test-mode delta support; getCurrentTime, setCurrentDelta, clearCurrentDelta. |
| [url-validation.ts](src/lib/url-validation.md) | validateCallbackUrl — prevents open redirects; allows relative paths and same-origin URLs only. |
| [validators.ts](src/lib/validators.md) | Valibot schemas for auth forms (sign-in, sign-up, forgot/reset password, change password, resend email). |

## lib/db/

| File | Summary |
|------|---------|
| [auth-access.ts](src/lib/db/auth-access.md) | DB access for auth: user lookup, deleteUserAccount, accountUpdatedAt management. |
| [category-access.ts](src/lib/db/category-access.md) | DB access for categories: listCategories, findCategoryByName, createCategory. |
| [confirm-helpers.ts](src/lib/db/confirm-helpers.md) | Shared confirmation pipeline: resolveConfirmTagsAndCategory, createOrReuseCategory, createOrReuseTag. |
| [expense-access.ts](src/lib/db/expense-access.md) | DB access for expenses and recurring templates: CRUD, list with filters, tag linking. |
| [summary-access.ts](src/lib/db/summary-access.md) | DB access for summary aggregation: group-by dimension, granularity, chronological sort. |
| [tag-access.ts](src/lib/db/tag-access.md) | DB access for tags: listTags, createTag, tag name lookup. |

## middleware/

| File | Summary |
|------|---------|
| [guard-sign-up-mode.ts](src/middleware/guard-sign-up-mode.md) | Middleware restricting sign-up routes based on SIGN_UP_MODE env var. |
| [signed-in-access.ts](src/middleware/signed-in-access.md) | Middleware requiring authenticated session; redirects to sign-in if not signed in. |

## components/

| File | Summary |
|------|---------|
| [gated-sign-up-form.tsx](src/components/gated-sign-up-form.md) | JSX form for gated sign-up with invite code, name, email, password fields. |
| [tag-chip-checkboxes.tsx](src/components/tag-chip-checkboxes.md) | JSX component rendering tag checkboxes as clickable chips with new-tag input. |

## routes/

| File | Summary |
|------|---------|
| [build-404.tsx](src/routes/build-404.md) | 404 not-found page route. |
| [build-categories.tsx](src/routes/build-categories.md) | Category management page route. |
| [build-layout.tsx](src/routes/build-layout.md) | Shared HTML layout wrapper (head, nav, body shell) used by all pages. |
| [build-recurring.tsx](src/routes/build-recurring.md) | Recurring templates list page route. |
| [build-root.tsx](src/routes/build-root.md) | Root `/` route; redirects to expenses or sign-in based on auth state. |
| [build-summary.tsx](src/routes/build-summary.md) | Summary page route with group-by controls, tag filters, sortable results table. |
| [build-tags.tsx](src/routes/build-tags.md) | Tag management page route. |
| [handle-set-db-failures.ts](src/routes/handle-set-db-failures.md) | Test route for simulating DB failures. |

## routes/auth/

| File | Summary |
|------|---------|
| [better-auth-handler.ts](src/routes/auth/better-auth-handler.md) | Sets up Better Auth catch-all API route and session-enriching middleware. |
| [better-auth-response-interceptor.ts](src/routes/auth/better-auth-response-interceptor.md) | Intercepts Better Auth API responses, converts to user-friendly redirects; form-data to JSON conversion. |
| [build-await-verification.tsx](src/routes/auth/build-await-verification.md) | GET /auth/await-verification page — instructs user to check email. |
| [build-email-confirmation.tsx](src/routes/auth/build-email-confirmation.md) | GET /auth/verify-email and /auth/email-sent — token verification and confirmation pages. |
| [build-forgot-password.tsx](src/routes/auth/build-forgot-password.md) | GET /auth/forgot-password — password reset request form. |
| [build-gated-interest-sign-up.tsx](src/routes/auth/build-gated-interest-sign-up.md) | Gated interest sign-up page (waitlist + invite code combined). |
| [build-gated-sign-up.tsx](src/routes/auth/build-gated-sign-up.md) | Gated sign-up page with invite code field. |
| [build-interest-sign-up.tsx](src/routes/auth/build-interest-sign-up.md) | Interest sign-up waitlist page. |
| [build-reset-password.tsx](src/routes/auth/build-reset-password.md) | GET /auth/reset-password — new password form with token validation. |
| [build-sign-in.tsx](src/routes/auth/build-sign-in.md) | GET /auth/sign-in — sign-in form with email pre-fill and sign-up mode links. |
| [build-sign-out.tsx](src/routes/auth/build-sign-out.md) | GET /auth/sign-out — sign-out success page. |
| [build-sign-up.tsx](src/routes/auth/build-sign-up.md) | GET /auth/sign-up — account creation form. |
| [build-waiting-for-reset.tsx](src/routes/auth/build-waiting-for-reset.md) | GET /auth/waiting-for-reset — password reset email sent confirmation. |
| [handle-forgot-password.ts](src/routes/auth/handle-forgot-password.md) | POST /auth/forgot-password — validates email, rate-limits, sends reset email. |
| [handle-gated-interest-sign-up.ts](src/routes/auth/handle-gated-interest-sign-up.md) | POST handler for gated interest sign-up form. |
| [handle-gated-sign-up.ts](src/routes/auth/handle-gated-sign-up.md) | POST handler for gated sign-up with invite code validation. |
| [handle-interest-sign-up.ts](src/routes/auth/handle-interest-sign-up.md) | POST handler for interest/waitlist sign-up. |
| [handle-resend-email.ts](src/routes/auth/handle-resend-email.md) | POST /auth/resend-email — rate-limited verification email resend. |
| [handle-reset-clock.ts](src/routes/auth/handle-reset-clock.md) | Test-only GET route to clear time delta cookie. |
| [handle-reset-password.ts](src/routes/auth/handle-reset-password.md) | POST /auth/reset-password — validates token and new password, resets via Better Auth. |
| [handle-set-clock.ts](src/routes/auth/handle-set-clock.md) | Test-only GET route to set time delta cookie. |
| [handle-sign-out.ts](src/routes/auth/handle-sign-out.md) | POST /auth/sign-out — calls Better Auth sign-out API, clears session cookies. |
| [handle-sign-up.ts](src/routes/auth/handle-sign-up.md) | POST /auth/sign-up — validates form, calls Better Auth signUpEmail, redirects to await verification. |

## routes/expenses/

| File | Summary |
|------|---------|
| [build-edit-expense.tsx](src/routes/expenses/build-edit-expense.md) | GET/POST /expenses/:id/edit, confirm-edit-new, delete — expense edit and delete flows. |
| [build-expenses.tsx](src/routes/expenses/build-expenses.md) | Route registration for expenses list (GET/POST) and confirm-create-new. |
| [expense-confirm-post-handler.ts](src/routes/expenses/expense-confirm-post-handler.md) | POST /expenses/confirm-create-new — finalizes expense with new categories/tags. |
| [expense-form-helpers.ts](src/routes/expenses/expense-form-helpers.md) | Shared helpers: emptyState, readRawBody for expense form parsing. |
| [expense-form.tsx](src/routes/expenses/expense-form.md) | Shared JSX renderer for expense create/edit form and confirm-new-items page. |
| [expense-get-handler.ts](src/routes/expenses/expense-get-handler.md) | GET /expenses — loads expenses, categories, tags, filters; renders list page. |
| [expense-list-renderer.tsx](src/routes/expenses/expense-list-renderer.md) | JSX renderers for filter bar, expense table, and full expenses page. |
| [expense-post-handler.ts](src/routes/expenses/expense-post-handler.md) | POST /expenses — validates, creates expense or shows confirm-new-items page. |

## routes/profile/

| File | Summary |
|------|---------|
| [build-profile.tsx](src/routes/profile/build-profile.md) | GET /profile — user info, change password form, delete account link. |
| [build-delete-confirm.tsx](src/routes/profile/build-delete-confirm.md) | GET /profile/delete-confirm — account deletion confirmation page. |
| [handle-change-password.ts](src/routes/profile/handle-change-password.md) | POST /profile — validates and changes password via Better Auth. |
| [handle-delete-account.ts](src/routes/profile/handle-delete-account.md) | POST /profile/delete — deletes user account and clears session cookies. |

## routes/recurring/

| File | Summary |
|------|---------|
| [build-create-recurring.tsx](src/routes/recurring/build-create-recurring.md) | GET/POST /recurring/new, /recurring, confirm-create-new — recurring template creation. |
| [build-edit-recurring.tsx](src/routes/recurring/build-edit-recurring.md) | GET/POST /recurring/:id/edit, confirm-edit-new, delete — recurring template edit and delete. |
| [recurring-form.tsx](src/routes/recurring/recurring-form.md) | Shared JSX renderer for recurring template create/edit form. |

## routes/test/

| File | Summary |
|------|---------|
| [database.ts](src/routes/test/database.md) | Test-only route for DB inspection/reset. |
| [run-cron.ts](src/routes/test/run-cron.md) | Test-only route to manually trigger cron job. |
| [sign-up-mode.ts](src/routes/test/sign-up-mode.md) | Test-only route to inspect/change sign-up mode. |
| [smtp-config.ts](src/routes/test/smtp-config.md) | Test-only route to inspect SMTP configuration. |
