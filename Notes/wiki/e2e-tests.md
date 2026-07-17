# E2E Tests Catalog

Catalog of all Playwright end-to-end test files under `e2e-tests/`. Tests run against a local dev server with test routes enabled.

## expenses/

| File | Summary |
|------|---------|
| [01-list-rendering.spec.ts](e2e-tests/expenses/01-list-rendering.md) | Verifies expense list renders rows with correct data, empty state, and default date range. |
| [02-entry-form.spec.ts](e2e-tests/expenses/02-entry-form.md) | Tests expense entry form fields, defaults, and successful submission. |
| [03-validation-errors.spec.ts](e2e-tests/expenses/03-validation-errors.md) | Field-level validation errors for description, amount, date, category. |
| [04-inline-category-creation.spec.ts](e2e-tests/expenses/04-inline-category-creation.md) | Creating a new category via the form triggers confirmation page. |
| [05-tags-and-inline-creation.spec.ts](e2e-tests/expenses/05-tags-and-inline-creation.md) | Tag selection, new tag creation, and confirmation flow. |
| [06-category-combobox-js.spec.ts](e2e-tests/expenses/06-category-combobox-js.md) | Category combobox JS enhancement: filtering, keyboard nav, create option. |
| [07-tag-chip-picker-js.spec.ts](e2e-tests/expenses/07-tag-chip-picker-js.md) | Tag chip checkbox JS enhancement: toggle visual state, new tag preview chips. |
| [08-no-js-fallback.spec.ts](e2e-tests/expenses/08-no-js-fallback.md) | Form works without JavaScript as plain HTML fields. |
| [09-edit-expense.spec.ts](e2e-tests/expenses/09-edit-expense.md) | Edit existing expense: form pre-fill, save changes, back navigation. |
| [10-edit-with-new-items.spec.ts](e2e-tests/expenses/10-edit-with-new-items.md) | Edit expense with new category/tag triggers confirmation page. |
| [11-delete-expense.spec.ts](e2e-tests/expenses/11-delete-expense.md) | Delete expense confirmation page and successful deletion. |
| [12-category-management.spec.ts](e2e-tests/expenses/12-category-management.md) | Category management page: list, create, edit, delete. |
| [13-tag-management.spec.ts](e2e-tests/expenses/13-tag-management.md) | Tag management page: list, create, edit, delete. |
| [14-filter-description-dates.spec.ts](e2e-tests/expenses/14-filter-description-dates.md) | Filter by description text and date range. |
| [15-filter-category-tags.spec.ts](e2e-tests/expenses/15-filter-category-tags.md) | Filter by category and tags with AND/OR toggle. |
| [16-filter-combined-clear.spec.ts](e2e-tests/expenses/16-filter-combined-clear.md) | Combined filters and clear-filters button. |
| [16-summary-default-and-grouping.spec.ts](e2e-tests/expenses/16-summary-default-and-grouping.md) | Summary page defaults and group-by dimension controls. |
| [17-summary-date-range-and-empty.spec.ts](e2e-tests/expenses/17-summary-date-range-and-empty.md) | Summary page date range filter and empty state. |
| [18-entry-tag-chip-ui.spec.ts](e2e-tests/expenses/18-entry-tag-chip-ui.md) | Tag chip checkbox UI in the entry form. |
| [19-entry-new-tag-confirmation.spec.ts](e2e-tests/expenses/19-entry-new-tag-confirmation.md) | New tag confirmation flow from entry form. |
| [20-entry-tamper-and-error.spec.ts](e2e-tests/expenses/20-entry-tamper-and-error.md) | Hidden input tamper protection and error handling. |
| [21-entry-no-js-and-broken-js.spec.ts](e2e-tests/expenses/21-entry-no-js-and-broken-js.md) | Entry form works with no JS and with broken JS (graceful degradation). |
| [22-edit-tag-chip-ui.spec.ts](e2e-tests/expenses/22-edit-tag-chip-ui.md) | Tag chip checkbox UI in the edit form. |
| [23-list-filter-chip-unification.spec.ts](e2e-tests/expenses/23-list-filter-chip-unification.md) | Unified tag chip component in filter bar and forms. |

## gated-sign-up/

| File | Summary |
|------|---------|
| [01-gated-signup-with-valid-code.spec.ts](e2e-tests/gated-sign-up/01-gated-signup-with-valid-code.md) | Sign up with a valid invite code succeeds. |
| [02-gated-signup-with-invalid-code.spec.ts](e2e-tests/gated-sign-up/02-gated-signup-with-invalid-code.md) | Sign up with invalid/expired code fails with error. |
| [03-page-navigation-buttons.spec.ts](e2e-tests/gated-sign-up/03-page-navigation-buttons.md) | Navigation buttons on gated sign-up page. |
| [04-name-validation.spec.ts](e2e-tests/gated-sign-up/04-name-validation.md) | Name field validation on gated sign-up. |
| [05-code-consumption-semantics.spec.ts](e2e-tests/gated-sign-up/05-code-consumption-semantics.md) | Invite code consumption: single-use, claiming logic. |

## general/

| File | Summary |
|------|---------|
| [01-startup-initial-page.spec.ts](e2e-tests/general/01-startup-initial-page.md) | App startup shows correct initial page based on auth state. |
| [02-visit-nonexistent-page.spec.ts](e2e-tests/general/02-visit-nonexistent-page.md) | Visiting a nonexistent URL shows 404 page. |
| [03-test-body-size-limit.spec.ts](e2e-tests/general/03-test-body-size-limit.md) | Request body size limit enforcement. |
| [04-test-secure-headers.spec.ts](e2e-tests/general/04-test-secure-headers.md) | Secure HTTP headers present on responses. |
| [05-sign-in-page-elements.spec.ts](e2e-tests/general/05-sign-in-page-elements.md) | Sign-in page renders expected elements. |
| [06-expense-routes-require-auth.spec.ts](e2e-tests/general/06-expense-routes-require-auth.md) | Expense routes redirect to sign-in when not authenticated. |
| [07-expense-routes-signed-in.spec.ts](e2e-tests/general/07-expense-routes-signed-in.md) | Expense routes accessible when signed in. |
| [08-expense-nav-links.spec.ts](e2e-tests/general/08-expense-nav-links.md) | Navigation links between pages work correctly. |

## interest-sign-up/

| File | Summary |
|------|---------|
| [01-can-join-waitlist-with-valid-email.spec.ts](e2e-tests/interest-sign-up/01-can-join-waitlist-with-valid-email.md) | Join waitlist with valid email succeeds. |
| [02-validates-email-input.spec.ts](e2e-tests/interest-sign-up/02-validates-email-input.md) | Email validation on interest sign-up form. |
| [03-navigation-and-ui-tests.spec.ts](e2e-tests/interest-sign-up/03-navigation-and-ui-tests.md) | Navigation and UI elements on interest sign-up page. |
| [04-page-navigation-buttons.spec.ts](e2e-tests/interest-sign-up/04-page-navigation-buttons.md) | Navigation buttons on interest sign-up page. |

## no-sign-up/

| File | Summary |
|------|---------|
| [01-sign-up-routes-return-404.spec.ts](e2e-tests/no-sign-up/01-sign-up-routes-return-404.md) | Sign-up routes return 404 when sign-up mode is 'none'. |
| [02-sign-up-post-requests-fail.spec.ts](e2e-tests/no-sign-up/02-sign-up-post-requests-fail.md) | Sign-up POST requests fail when sign-up is disabled. |

## profile/

| File | Summary |
|------|---------|
| [01-profile-page-elements.spec.ts](e2e-tests/profile/01-profile-page-elements.md) | Profile page renders user info, change password, delete account sections. |
| [02-change-password.spec.ts](e2e-tests/profile/02-change-password.md) | Change password flow with current/new/confirm fields. |
| [03-delete-account.spec.ts](e2e-tests/profile/03-delete-account.md) | Delete account confirmation and successful deletion. |

## recurring/

| File | Summary |
|------|---------|
| [01-recurring-list-rendering.spec.ts](e2e-tests/recurring/01-recurring-list-rendering.md) | Recurring templates list renders rows with correct data. |
| [02-recurring-entry-form.spec.ts](e2e-tests/recurring/02-recurring-entry-form.md) | Recurring template creation form fields and submission. |
| [03-recurring-validation-errors.spec.ts](e2e-tests/recurring/03-recurring-validation-errors.md) | Validation errors for recurring form fields. |
| [04-recurring-edit.spec.ts](e2e-tests/recurring/04-recurring-edit.md) | Edit recurring template: pre-fill, save, navigation. |
| [05-recurring-delete.spec.ts](e2e-tests/recurring/05-recurring-delete.md) | Delete recurring template confirmation and deletion. |
| [06-recurring-cron-generates-expenses.spec.ts](e2e-tests/recurring/06-recurring-cron-generates-expenses.md) | Cron trigger materializes recurring templates into expenses. |
| [07-recurring-inline-category-creation.spec.ts](e2e-tests/recurring/07-recurring-inline-category-creation.md) | New category creation in recurring form with confirmation. |
| [08-recurring-tags-and-inline-creation.spec.ts](e2e-tests/recurring/08-recurring-tags-and-inline-creation.md) | Tag selection and new tag creation in recurring form. |
| [09-create-tag-chip-ui.spec.ts](e2e-tests/recurring/09-create-tag-chip-ui.md) | Tag chip checkbox UI in recurring create form. |
| [10-edit-tag-chip-ui.spec.ts](e2e-tests/recurring/10-edit-tag-chip-ui.md) | Tag chip checkbox UI in recurring edit form. |

## reset-password/

| File | Summary |
|------|---------|
| [01-request-reset-link.spec.ts](e2e-tests/reset-password/01-request-reset-link.md) | Request password reset link with valid email. |
| [02-reset-password-with-token.spec.ts](e2e-tests/reset-password/02-reset-password-with-token.md) | Reset password using valid token from email. |
| [03-reset-password-invalid-token.spec.ts](e2e-tests/reset-password/03-reset-password-invalid-token.md) | Reset password with invalid/expired token shows error. |
| [04-password-reset-validation-errors.spec.ts](e2e-tests/reset-password/04-password-reset-validation-errors.md) | Validation errors on reset password form. |
| [05-password-reset-navigation.spec.ts](e2e-tests/reset-password/05-password-reset-navigation.md) | Navigation between reset password pages. |
| [06-password-reset-rate-limiting.spec.ts](e2e-tests/reset-password/06-password-reset-rate-limiting.md) | Rate limiting on password reset requests. |
| [07-password-reset-email-send-failure.spec.ts](e2e-tests/reset-password/07-password-reset-email-send-failure.md) | Handling of email send failure during reset. |
| [08-password-reset-token-url-encoding.spec.ts](e2e-tests/reset-password/08-password-reset-token-url-encoding.md) | Token URL encoding/decoding in reset link. |

## sign-in/

| File | Summary |
|------|---------|
| [01-cant-sign-in-with-unknown-email.spec.ts](e2e-tests/sign-in/01-cant-sign-in-with-unknown-email.md) | Sign-in with unknown email fails. |
| [02-can-sign-in-with-known-email.spec.ts](e2e-tests/sign-in/02-can-sign-in-with-known-email.md) | Sign-in with known email and correct password succeeds. |
| [03-cant-sign-in-with-wrong-password.spec.ts](e2e-tests/sign-in/03-cant-sign-in-with-wrong-password.md) | Sign-in with wrong password fails. |
| [04-cant-visit-protected-page-signed-out.spec.ts](e2e-tests/sign-in/04-cant-visit-protected-page-signed-out.md) | Protected pages redirect to sign-in when signed out. |
| [05-sign-out-successfully.spec.ts](e2e-tests/sign-in/05-sign-out-successfully.md) | Sign-out clears session and shows success page. |

## sign-up/

| File | Summary |
|------|---------|
| [01-sign-up-with-good-email-and-password.spec.ts](e2e-tests/sign-up/01-sign-up-with-good-email-and-password.md) | Sign-up with valid credentials creates account. |
| [02-must-validate-email.spec.ts](e2e-tests/sign-up/02-must-validate-email.md) | Unverified user cannot access protected pages. |
| [03-can-validate-email.spec.ts](e2e-tests/sign-up/03-can-validate-email.md) | Email verification token flow succeeds. |
| [04-cannot-access-private-before-verification.spec.ts](e2e-tests/sign-up/04-cannot-access-private-before-verification.md) | Private routes blocked until email verified. |
| [05-can-resend-verification-email.spec.ts](e2e-tests/sign-up/05-can-resend-verification-email.md) | Resend verification email flow. |
| [06-resend-email-rate-limiting.spec.ts](e2e-tests/sign-up/06-resend-email-rate-limiting.md) | Rate limiting on resend verification email. |
| [07-cannot-access-await-verification-without-email-cookie.spec.ts](e2e-tests/sign-up/07-cannot-access-await-verification-without-email-cookie.md) | Await-verification page redirects without email cookie. |
| [08-page-navigation-buttons.spec.ts](e2e-tests/sign-up/08-page-navigation-buttons.md) | Navigation buttons on sign-up pages. |
| [09-unverified-sign-in-redirects-to-await-verification.spec.ts](e2e-tests/sign-up/09-unverified-sign-in-redirects-to-await-verification.md) | Unverified user sign-in redirects to await-verification. |
| [10-duplicate-unverified-signup-redirects.spec.ts](e2e-tests/sign-up/10-duplicate-unverified-signup-redirects.md) | Duplicate unverified sign-up redirects to await-verification. |
| [11-name-validation.spec.ts](e2e-tests/sign-up/11-name-validation.md) | Name field validation on sign-up form. |

## summary/

| File | Summary |
|------|---------|
| [01-summary-defaults-and-controls.spec.ts](e2e-tests/summary/01-summary-defaults-and-controls.md) | Summary page default state and control elements. |
| [02-summary-tag-filter-and-recurring.spec.ts](e2e-tests/summary/02-summary-tag-filter-and-recurring.md) | Summary tag filter and recurring expense display. |
| [03-summary-chip-and-sort.spec.ts](e2e-tests/summary/03-summary-chip-and-sort.md) | Summary tag chip UI and sort functionality. |

## support/

| File | Summary |
|------|---------|
| [auth-helpers.ts](e2e-tests/support/auth-helpers.md) | E2E test helpers for authentication (sign in, sign out, get session). |
| [db-helpers.ts](e2e-tests/support/db-helpers.md) | E2E test helpers for database operations (seed, cleanup). |
| [finders.ts](e2e-tests/support/finders.md) | E2E test helper functions for finding elements on the page. |
| [form-helpers.ts](e2e-tests/support/form-helpers.md) | E2E test helpers for filling and submitting forms. |
| [mode-helpers.ts](e2e-tests/support/mode-helpers.md) | E2E test helpers for sign-up mode configuration. |
| [navigation-helpers.ts](e2e-tests/support/navigation-helpers.md) | E2E test helpers for page navigation. |
| [page-verifiers.ts](e2e-tests/support/page-verifiers.md) | E2E test helper functions for verifying page state. |
| [test-data.ts](e2e-tests/support/test-data.md) | E2E test data constants and factories. |
| [test-helpers.ts](e2e-tests/support/test-helpers.md) | General-purpose E2E test utilities. |
| [validation-helpers.ts](e2e-tests/support/validation-helpers.md) | E2E helpers for asserting validation errors. |
| [workflow-helpers.ts](e2e-tests/support/workflow-helpers.md) | E2E helpers for multi-step workflows (sign-up + verify, reset password). |
