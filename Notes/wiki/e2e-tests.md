# E2E Tests Catalog

Catalog of all Playwright end-to-end tests under `e2e-tests/`, organized by feature area. Each file links to its individual wiki page.

## Support utilities (`e2e-tests/support/`)

- [e2e-tests/support/auth-helpers.ts](./e2e-tests/support/auth-helpers.md) — Sign-in/sign-out helpers for test scenarios.
- [e2e-tests/support/db-helpers.ts](./e2e-tests/support/db-helpers.md) — Database clearing, seeding, and session cleanup via test endpoints. Issue 13 adds `seedRecurringTemplates` and `seedGeneratedExpense` helpers. Issue 14: `SeedRecurringRow` gains optional `createdAtIso` field to override the creation timestamp for clock-controlled tests.
- [e2e-tests/support/finders.ts](./e2e-tests/support/finders.md) — Page element locators and finder functions.
- [e2e-tests/support/form-helpers.ts](./e2e-tests/support/form-helpers.md) — Form filling and submission utilities.
- [e2e-tests/support/mode-helpers.ts](./e2e-tests/support/mode-helpers.md) — Helpers to inspect and assert current SIGN_UP_MODE.
- [e2e-tests/support/navigation-helpers.ts](./e2e-tests/support/navigation-helpers.md) — Navigation between pages (click links, goto URLs).
- [e2e-tests/support/page-verifiers.ts](./e2e-tests/support/page-verifiers.md) — Assertions for page content, titles, and visible elements.
- [e2e-tests/support/test-data.ts](./e2e-tests/support/test-data.md) — Shared test data (emails, passwords, names, codes).
- [e2e-tests/support/test-helpers.ts](./e2e-tests/support/test-helpers.md) — testWithDatabase wrapper providing DB isolation per test.
- [e2e-tests/support/validation-helpers.ts](./e2e-tests/support/validation-helpers.md) — Assert validation error messages and field states.
- [e2e-tests/support/workflow-helpers.ts](./e2e-tests/support/workflow-helpers.md) — Multi-step workflow orchestration helpers.

## Gated sign-up (`e2e-tests/gated-sign-up/`)

- [e2e-tests/gated-sign-up/01-gated-signup-with-valid-code.spec.ts](./e2e-tests/gated-sign-up/01-gated-signup-with-valid-code.spec.md) — Successful gated sign-up using a valid single-use code.
- [e2e-tests/gated-sign-up/02-gated-signup-with-invalid-code.spec.ts](./e2e-tests/gated-sign-up/02-gated-signup-with-invalid-code.spec.md) — Rejection when using an invalid or already-used code.
- [e2e-tests/gated-sign-up/03-page-navigation-buttons.spec.ts](./e2e-tests/gated-sign-up/03-page-navigation-buttons.spec.md) — Navigation elements (back, home) on gated sign-up pages.
- [e2e-tests/gated-sign-up/04-name-validation.spec.ts](./e2e-tests/gated-sign-up/04-name-validation.spec.md) — Name field validation rules on gated sign-up form.
- [e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts](./e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.md) — Ensures single-use codes are consumed/invalidated after use.

## General (`e2e-tests/general/`)

- [e2e-tests/general/01-startup-initial-page.spec.ts](./e2e-tests/general/01-startup-initial-page.spec.md) — Root page loads correctly on startup.
- [e2e-tests/general/02-visit-nonexistent-page.spec.ts](./e2e-tests/general/02-visit-nonexistent-page.spec.md) — 404 page is rendered for unknown routes (HTTP 200 with 404 content).
- [e2e-tests/general/03-test-body-size-limit.spec.ts](./e2e-tests/general/03-test-body-size-limit.spec.md) — Large request bodies are rejected with 413.
- [e2e-tests/general/04-test-secure-headers.spec.ts](./e2e-tests/general/04-test-secure-headers.spec.md) — Security headers are present on responses.
- [e2e-tests/general/05-sign-in-page-elements.spec.ts](./e2e-tests/general/05-sign-in-page-elements.spec.md) — Sign-in page contains expected fields and buttons.
- [e2e-tests/general/06-expense-routes-require-auth.spec.ts](./e2e-tests/general/06-expense-routes-require-auth.spec.md) — All expense feature routes (`/expenses`, `/categories`, `/tags`, `/summary`, `/recurring`) redirect unauthenticated visitors to sign-in.
- [e2e-tests/general/07-expense-routes-signed-in.spec.ts](./e2e-tests/general/07-expense-routes-signed-in.spec.md) — Signed-in users see correct headings on each expense feature route, and `/expenses` shows the empty-state message.
- [e2e-tests/general/08-expense-nav-links.spec.ts](./e2e-tests/general/08-expense-nav-links.spec.md) — Header nav links for the expense feature appear only when signed in and navigate to the correct pages.

## Expenses (`e2e-tests/expenses/`)

- [e2e-tests/expenses/01-list-rendering.spec.ts](./e2e-tests/expenses/01-list-rendering.spec.md) — Issue 02. Seeds expenses across the default ET window plus one outside it; asserts ordering, formatting, tag join, and out-of-window exclusion on `/expenses`.
- [e2e-tests/expenses/02-entry-form.spec.ts](./e2e-tests/expenses/02-entry-form.spec.md) — Issue 03. Renders the entry form with today (ET) defaulted, submits each amount variant from the issue and asserts PRG + formatted row, and verifies server-side rejection of `0` and non-numeric amounts (now via the field-level error testid added in Issue 04).
- [e2e-tests/expenses/03-validation-errors.spec.ts](./e2e-tests/expenses/03-validation-errors.spec.md) — Issue 04. Per-field validation and sticky-value coverage: empty / over-max description, four bad amounts, invalid date `2025-13-40`, missing category, all-bad-at-once, and a fix-and-resubmit round trip.
- [e2e-tests/expenses/04-inline-category-creation.spec.ts](./e2e-tests/expenses/04-inline-category-creation.spec.md) — Issue 05. Inline-category-creation flow: unmatched names render the consolidated confirmation page; Confirm atomically creates the category + expense (with case-insensitive lookup on subsequent submits); Cancel rounds-trips every typed value with no DB writes; over-max and whitespace-only names short-circuit before the confirmation page. Testids renamed to `confirm-create-new-*` in Issue 06.
- [e2e-tests/expenses/05-tags-and-inline-creation.spec.ts](./e2e-tests/expenses/05-tags-and-inline-creation.spec.md) — Issue 06. Tags CSV input + combined inline-creation flow: mixed existing+new tags route through the generalised confirmation page with case-insensitive de-duplication and alphabetical list rendering; brand-new category + new tags lists every new name; subsequent all-existing submission takes the direct path; Cancel preserves the **raw** typed CSV; over-max tag names short-circuit with a `tags` field error; whitespace-only CSV creates the expense with no tags attached.
- [e2e-tests/expenses/06-category-combobox-js.spec.ts](./e2e-tests/expenses/06-category-combobox-js.spec.md) — JS-on test for the progressive-enhancement category combobox (`public/js/category-combobox.js`). Typing filters suggestions; ArrowDown+Enter selects an existing category; typing a new name surfaces a Create row that routes through confirmation.
- [e2e-tests/expenses/07-tag-chip-picker-js.spec.ts](./e2e-tests/expenses/07-tag-chip-picker-js.spec.md) — JS-on test for the progressive-enhancement tag chip picker (`public/js/tag-chip-picker.js`). Add existing tag via Enter, create new tag via Create row, remove via × button. Validates that pre-seeded form values rehydrate as chips after a validation-error round-trip.
- [e2e-tests/expenses/08-no-js-fallback.spec.ts](./e2e-tests/expenses/08-no-js-fallback.spec.md) — JS-disabled fallback verifying the server-side flow is untouched: category and tags inputs remain plain text fields, combobox/chip-picker surfaces elements are absent, all-existing submission goes direct, and brand-new values route through confirmation.
- [e2e-tests/expenses/09-edit-expense.spec.ts](./e2e-tests/expenses/09-edit-expense.spec.md) — Issue 08. All-existing edit-save flow: the edit page pre-populates every field (alphabetised tags, plain-decimal amount); changing the amount, description, and date saves and re-renders correctly on `/expenses`; an unknown id redirects back to `/expenses`.
- [e2e-tests/expenses/10-edit-with-new-items.spec.ts](./e2e-tests/expenses/10-edit-with-new-items.spec.md) — Issue 08. Edit-flow consolidated *Confirm new items* page (`mode='edit'`): adding a brand-new tag routes through `confirm-edit-new-page` and saves on confirm; Cancel preserves every typed value and makes no DB changes; brand-new category + new tag lists both lines and saves on confirm.
- [e2e-tests/expenses/11-delete-expense.spec.ts](./e2e-tests/expenses/11-delete-expense.spec.md) — Issue 08. Delete flow: `confirm-delete-expense-page` shows every detail; Cancel returns to the edit page with no changes; Confirm deletes the row (cascading the `expenseTag` links) and removes it from the list while leaving siblings intact; an unknown id redirects.
- [e2e-tests/expenses/12-category-management.spec.ts](./e2e-tests/expenses/12-category-management.spec.md) — Issue 09. Category management page flows: create + duplicate validation, over-limit sticky validation, simple rename, rename collision merge confirmation/confirm/cancel, and delete blocked/success behavior.
- [e2e-tests/expenses/13-tag-management.spec.ts](./e2e-tests/expenses/13-tag-management.spec.md) — Issue 10. Tag management page flows: create + duplicate validation, over-limit sticky validation, simple rename, rename collision merge confirmation/confirm/cancel, and delete blocked/success behavior.
- [e2e-tests/expenses/14-filter-description-dates.spec.ts](./e2e-tests/expenses/14-filter-description-dates.spec.md) — Issue 11. Filter bar rendering; first-load default 2-month window; description substring/case-insensitive search; from-only, to-only, both, neither date filters; filter values reflected in inputs after submit.
- [e2e-tests/expenses/15-filter-category-tags.spec.ts](./e2e-tests/expenses/15-filter-category-tags.spec.md) — Issue 11. Category dropdown filters to matching category; all-categories option returns all; tag checkboxes visible when tags exist; tag OR returns expenses with any selected tag; tag AND returns only expenses with all selected tags; tag selection persists.
- [e2e-tests/expenses/16-filter-combined-clear.spec.ts](./e2e-tests/expenses/16-filter-combined-clear.spec.md) — Issue 11. Combined description + from + category filter; Clear filters absent on first load; Clear appears after applying a filter; Clear link navigates to unfiltered page and resets inputs; no-match yields empty state; Clear after no-match restores results; description + tag OR is additive AND between both fields.
- [e2e-tests/expenses/16-summary-default-and-grouping.spec.ts](./e2e-tests/expenses/16-summary-default-and-grouping.spec.md) — 2026-05-22. Placeholder test asserting the summary page shows "Summary coming soon". (Original Issue 12 grouping/grand-total tests removed when the full summary implementation was deleted.)
- [e2e-tests/expenses/17-summary-date-range-and-empty.spec.ts](./e2e-tests/expenses/17-summary-date-range-and-empty.spec.md) — 2026-05-22. Placeholder test asserting the summary page shows "Summary coming soon". (Original Issue 12 date-range/category/tag filter tests removed when the full summary implementation was deleted.)
- [e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts](./e2e-tests/expenses/18-entry-tag-chip-ui.spec.md) — Tag chip-checkbox UI on the expense entry form: seeded tags render as alphabetically-ordered chips with `data-testid="tag-chip-checkboxes"`; toggling chips updates native checkboxes; selected chips are visually distinct via class change; submitted form attaches selected tags to the created expense; chip inputs use `name=tagId` with ULID values.
- [e2e-tests/expenses/19-entry-new-tag-confirmation.spec.ts](./e2e-tests/expenses/19-entry-new-tag-confirmation.spec.md) — New-tag confirmation flow via the chip UI: typing new tag names in the `newTags` input reaches `confirm-create-new-page` listing each new tag; mixed comma and whitespace separators create all named tags; typing an existing tag name while its chip is selected deduplicates so the tag is attached exactly once.
- [e2e-tests/expenses/20-entry-tamper-and-error.spec.ts](./e2e-tests/expenses/20-entry-tamper-and-error.spec.md) — Cancel and tamper/error recovery: cancelling confirmation preserves chip selections and `newTags` text; submitting a non-ULID `tagId` or an unknown-but-valid ULID shows a recoverable error with all form values preserved.
- [e2e-tests/expenses/21-entry-no-js-and-broken-js.spec.ts](./e2e-tests/expenses/21-entry-no-js-and-broken-js.spec.md) — Progressive-enhancement resilience: with JS disabled, native checkboxes still toggle and submit correctly; `newTags` text field submits and reaches confirmation; validation-error round-trip preserves checked chips. With broken JS (throwing module), native checkboxes remain functional and form submission succeeds.

## Interest sign-up (`e2e-tests/interest-sign-up/`)

- [e2e-tests/interest-sign-up/01-can-join-waitlist-with-valid-email.spec.ts](./e2e-tests/interest-sign-up/01-can-join-waitlist-with-valid-email.spec.md) — Successfully joins interest waitlist with valid email.
- [e2e-tests/interest-sign-up/02-validates-email-input.spec.ts](./e2e-tests/interest-sign-up/02-validates-email-input.spec.md) — Email validation on interest form.
- [e2e-tests/interest-sign-up/03-navigation-and-ui-tests.spec.ts](./e2e-tests/interest-sign-up/03-navigation-and-ui-tests.spec.md) — UI and navigation on interest sign-up flow.
- [e2e-tests/interest-sign-up/04-page-navigation-buttons.spec.ts](./e2e-tests/interest-sign-up/04-page-navigation-buttons.spec.md) — Navigation buttons on interest sign-up pages.

## No sign-up (`e2e-tests/no-sign-up/`)

- [e2e-tests/no-sign-up/01-sign-up-routes-return-404.spec.ts](./e2e-tests/no-sign-up/01-sign-up-routes-return-404.spec.md) — Sign-up routes return 404 when NO_SIGN_UP mode is active.
- [e2e-tests/no-sign-up/02-sign-up-post-requests-fail.spec.ts](./e2e-tests/no-sign-up/02-sign-up-post-requests-fail.spec.md) — POST requests to sign-up handlers are rejected in NO_SIGN_UP mode.
- [e2e-tests/no-sign-up/03-sign-in-page-has-no-signup-link.spec.ts](./e2e-tests/no-sign-up/03-sign-in-page-has-no-signup-link.spec.md) — Sign-in page does not display a sign-up link in NO_SIGN_UP mode.
- [e2e-tests/no-sign-up/04-page-navigation-buttons.spec.ts](./e2e-tests/no-sign-up/04-page-navigation-buttons.spec.md) — Navigation buttons behave correctly in NO_SIGN_UP mode.

## Profile (`e2e-tests/profile/`)

- [e2e-tests/profile/01-can-access-profile-page.spec.ts](./e2e-tests/profile/01-can-access-profile-page.spec.md) — Authenticated users can access the profile page.
- [e2e-tests/profile/02-can-change-password.spec.ts](./e2e-tests/profile/02-can-change-password.spec.md) — Password change flow works end-to-end.
- [e2e-tests/profile/03-humorous-question-changes-daily.spec.ts](./e2e-tests/profile/03-humorous-question-changes-daily.spec.md) — Daily humorous/security question changes.
- [e2e-tests/profile/04-validation-errors.spec.ts](./e2e-tests/profile/04-validation-errors.spec.md) — Profile form validation errors.
- [e2e-tests/profile/05-delete-account-cancel.spec.ts](./e2e-tests/profile/05-delete-account-cancel.spec.md) — Canceling account deletion returns to profile.
- [e2e-tests/profile/06-delete-account-confirm.spec.ts](./e2e-tests/profile/06-delete-account-confirm.spec.md) — Confirming account deletion removes the account.

## Reset password (`e2e-tests/reset-password/`)

- [e2e-tests/reset-password/01-can-access-forgot-password-page.spec.ts](./e2e-tests/reset-password/01-can-access-forgot-password-page.spec.md) — Forgot-password page is accessible.
- [e2e-tests/reset-password/02-can-request-password-reset.spec.ts](./e2e-tests/reset-password/02-can-request-password-reset.spec.md) — Requesting reset sends an email.
- [e2e-tests/reset-password/03-complete-password-reset-flow.spec.ts](./e2e-tests/reset-password/03-complete-password-reset-flow.spec.md) — Full reset flow from request to new password.
- [e2e-tests/reset-password/04-password-reset-validation-errors.spec.ts](./e2e-tests/reset-password/04-password-reset-validation-errors.spec.md) — Validation errors on reset form.
- [e2e-tests/reset-password/05-password-reset-navigation.spec.ts](./e2e-tests/reset-password/05-password-reset-navigation.spec.md) — Navigation within reset password flow.
- [e2e-tests/reset-password/06-password-reset-rate-limiting.spec.ts](./e2e-tests/reset-password/06-password-reset-rate-limiting.spec.md) — Rate limiting on repeated reset requests.
- [e2e-tests/reset-password/07-password-reset-email-send-failure.spec.ts](./e2e-tests/reset-password/07-password-reset-email-send-failure.spec.md) — Graceful handling when email send fails.

## Sign-in (`e2e-tests/sign-in/`)

- [e2e-tests/sign-in/01-cant-sign-in-with-unknown-email.spec.ts](./e2e-tests/sign-in/01-cant-sign-in-with-unknown-email.spec.md) — Unknown email is rejected.
- [e2e-tests/sign-in/02-can-sign-in-with-known-email.spec.ts](./e2e-tests/sign-in/02-can-sign-in-with-known-email.spec.md) — Known email and correct password succeed.
- [e2e-tests/sign-in/03-cant-sign-in-with-wrong-password.spec.ts](./e2e-tests/sign-in/03-cant-sign-in-with-wrong-password.spec.md) — Wrong password is rejected.
- [e2e-tests/sign-in/04-cant-visit-protected-page-signed-out.spec.ts](./e2e-tests/sign-in/04-cant-visit-protected-page-signed-out.spec.md) — Unauthenticated users are redirected from `/expenses`.
- [e2e-tests/sign-in/05-sign-out-successfully.spec.ts](./e2e-tests/sign-in/05-sign-out-successfully.spec.md) — Sign-out flow clears session and redirects.

## Sign-up (`e2e-tests/sign-up/`)

- [e2e-tests/sign-up/01-sign-up-with-good-email-and-password.spec.ts](./e2e-tests/sign-up/01-sign-up-with-good-email-and-password.spec.md) — Successful open sign-up.
- [e2e-tests/sign-up/02-must-validate-email.spec.ts](./e2e-tests/sign-up/02-must-validate-email.spec.md) — Email must be verified before full access.
- [e2e-tests/sign-up/03-can-validate-email.spec.ts](./e2e-tests/sign-up/03-can-validate-email.spec.md) — Clicking verification link confirms email.
- [e2e-tests/sign-up/04-cannot-access-private-before-verification.spec.ts](./e2e-tests/sign-up/04-cannot-access-private-before-verification.spec.md) — Unverified users cannot access `/expenses`.
- [e2e-tests/sign-up/05-can-resend-verification-email.spec.ts](./e2e-tests/sign-up/05-can-resend-verification-email.spec.md) — Resend verification email functionality.
- [e2e-tests/sign-up/06-resend-email-rate-limiting.spec.ts](./e2e-tests/sign-up/06-resend-email-rate-limiting.spec.md) — Rate limiting on resend requests.
- [e2e-tests/sign-up/07-cannot-access-await-verification-without-email-cookie.spec.ts](./e2e-tests/sign-up/07-cannot-access-await-verification-without-email-cookie.spec.md) — Direct access to await-verification page is guarded.
- [e2e-tests/sign-up/08-page-navigation-buttons.spec.ts](./e2e-tests/sign-up/08-page-navigation-buttons.spec.md) — Navigation on sign-up pages.
- [e2e-tests/sign-up/09-unverified-sign-in-redirects-to-await-verification.spec.ts](./e2e-tests/sign-up/09-unverified-sign-in-redirects-to-await-verification.spec.md) — Unverified users signing in are redirected to verification prompt.
- [e2e-tests/sign-up/10-duplicate-unverified-signup-redirects.spec.ts](./e2e-tests/sign-up/10-duplicate-unverified-signup-redirects.spec.md) — Duplicate unverified sign-up redirects appropriately.
- [e2e-tests/sign-up/11-name-validation.spec.ts](./e2e-tests/sign-up/11-name-validation.spec.md) — Name field validation on sign-up form.

## Recurring templates (`e2e-tests/recurring/`)

- [e2e-tests/recurring/01-list-and-create.spec.ts](./e2e-tests/recurring/01-list-and-create.spec.md) — Issue 13. Empty-state rendering; create with new category+tag routes through `confirm-recurring-create-new-page` then appears in the list with correct next-occurrence; create with existing category+tag skips confirmation and sorts alphabetically.
- [e2e-tests/recurring/02-edit.spec.ts](./e2e-tests/recurring/02-edit.spec.md) — Issue 13. Edit page pre-populates all fields; simple save (no new items) redirects to list with updated row; adding a new tag routes through `confirm-recurring-edit-new-page`; cancel on confirmation returns to edit page with typed values preserved.
- [e2e-tests/recurring/03-delete.spec.ts](./e2e-tests/recurring/03-delete.spec.md) — Issue 13. Cancel on delete page returns to edit and template is still listed; confirm delete removes template but preserves past generated expense (seeded via `/test/seed-generated-expense`) with `recurringId` nulled.
- [e2e-tests/recurring/04-validation.spec.ts](./e2e-tests/recurring/04-validation.spec.md) — Issue 13. Per-field validation on create and edit forms: description over limit, amount zero, amount with three decimals, impossible anchor date `2025-02-30`; typed values preserved on redirect back.
- [e2e-tests/recurring/05-cron-28th-shift.spec.ts](./e2e-tests/recurring/05-cron-28th-shift.spec.md) — Issue 14. Monthly template anchored on day 31; four clock advances (mid-Feb → Mar 1 → Apr 1 → May 1) with `POST /test/run-cron`; asserts Feb 28 / Mar 31 / Apr 30 generated rows with `expense-row-recurring-badge` and `span.underline`.
- [e2e-tests/recurring/06-cron-idempotency.spec.ts](./e2e-tests/recurring/06-cron-idempotency.spec.md) — Issue 14. Three sub-tests: first-occurrence rule (generated=0), catch-up generation (generated=4), idempotency (second run generated=0, row count unchanged).
- [e2e-tests/recurring/07-generated-row-rendering.spec.ts](./e2e-tests/recurring/07-generated-row-rendering.spec.md) — Issue 14. Badge + underline on generated rows; manual rows lack badge; editing a generated row preserves `recurringId`; re-run cron on same clock = idempotent.
- [e2e-tests/recurring/08-generated-in-queries.spec.ts](./e2e-tests/recurring/08-generated-in-queries.spec.md) — Issue 14. Generated rows participate in description search, category filter, tag filter, and summary identically to manual rows.

## Summary (`e2e-tests/summary/`)

- [e2e-tests/summary/01-summary-defaults-and-controls.spec.ts](./e2e-tests/summary/01-summary-defaults-and-controls.spec.md) — Issue 17. Default state (month granularity, category dimension), dimension switching (time, tag, category-tag), granularity switching (quarter, year), sortable column headers, tag AND-semantic note, clear-reset flow, and empty state.
- [e2e-tests/summary/02-summary-tag-filter-and-recurring.spec.ts](./e2e-tests/summary/02-summary-tag-filter-and-recurring.spec.md) — Issue 17. Single-tag filter, multi-tag AND filter, three-tag AND empty result, recurring template exclusion until materialized, and materialized recurring row counting like a manual expense.

## Notes

- Mode-specific tests are skipped automatically when the running server is not in the matching `SIGN_UP_MODE`.
- All tests use the `testWithDatabase` wrapper from `support/test-helpers.ts` for database isolation.
- Dev-only test routes (`/test/*`) provide database cleanup, clock manipulation, and SMTP inspection for deterministic E2E scenarios.

## Cross-references

- See [source-code.md](source-code.md) for the source routes and handlers covered by these tests.
- See [unit-tests.md](unit-tests.md) for isolated utility tests.
