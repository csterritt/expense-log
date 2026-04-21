# page-verifiers.ts

**Source:** `e2e-tests/support/page-verifiers.ts`

## Purpose

Page-verification assertions used by navigation and workflow helpers. Each function asserts that a specific page banner element is present.

## Exports

### `verifyOnStartupPage(page): Promise<void>`

Asserts `startup-page-banner` element exists.

### `verifyOnSignInPage(page): Promise<void>`

Asserts `sign-in-page-banner` element exists.

### `verifyOnSignUpPage(page): Promise<void>`

Asserts `sign-up-page-banner` element exists.

### `verifyOnGatedSignUpPage(page): Promise<void>`

Alias for `verifyOnSignUpPage`.

### `verifyOnInterestSignUpPage(page): Promise<void>`

Alias for `verifyOnSignUpPage`.

### `verifyOnProtectedPage(page): Promise<void>`

Asserts `private-page-banner` element exists.

### `verifyOnAwaitVerificationPage(page): Promise<void>`

Asserts `await-verification-page` element exists.

### `verifyOn404Page(page): Promise<void>`

Asserts `404-page-banner` element exists and that `404-message` text is `'That page does not exist.'`.

### `verifyOnForgotPasswordPage(page): Promise<void>`

Asserts `forgot-password-page` element exists.

### `verifyOnWaitingForResetPage(page): Promise<void>`

Asserts `waiting-for-reset-page` element exists.

### `verifyOnResetPasswordPage(page): Promise<void>`

Asserts `reset-password-page` element exists.

### `verifyOnInvalidTokenPage(page): Promise<void>`

Asserts `invalid-token-page` element exists.

### `verifyOnProfilePage(page): Promise<void>`

Asserts `profile-page` element exists.

### `verifyOnDeleteConfirmPage(page): Promise<void>`

Asserts `delete-confirm-page` element exists.

### `verifyOnSignOutPage(page): Promise<void>`

Asserts `sign-out-page` element exists.

## Cross-references

- [finders.md](finders.md) — `verifyElementExists`, `getElementText`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
