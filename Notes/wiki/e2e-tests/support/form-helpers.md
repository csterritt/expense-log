# form-helpers.ts

**Source:** `e2e-tests/support/form-helpers.ts`

## Purpose

Higher-level form helpers that combine `fillInput` + `clickLink` calls for each form in the application.

## Exports

### `submitSignUpForm(page, user = TEST_USERS.NEW_USER): Promise<void>`

Fills name, email, password on the open sign-up form and clicks submit.

### `submitGatedSignUpForm(page, data): Promise<void>`

Fills code, name, email, password on the gated sign-up form and clicks submit.

### `submitSignInForm(page, user = TEST_USERS.KNOWN_USER): Promise<void>`

Fills email and password on the sign-in form and clicks submit.

### `submitInterestSignUpForm(page, email): Promise<void>`

Fills email on the interest/waitlist form and clicks submit.

### `submitForgotPasswordForm(page, email): Promise<void>`

Fills email on the forgot-password form and clicks submit.

### `submitResetPasswordForm(page, newPassword): Promise<void>`

Fills new password and confirm password on the reset form and clicks submit.

### `fillGatedSignUpFormPartial(page, fields): Promise<void>`

Conditionally fills only the provided fields (used for validation testing where some fields are intentionally omitted).

### `submitChangePasswordForm(page, currentPassword, newPassword): Promise<void>`

Fills current password, new password, and confirm password on the profile change-password form and clicks submit.

## Cross-references

- [finders.md](finders.md) — `fillInput`, `clickLink`
- [test-data.md](test-data.md) — `TEST_USERS`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
