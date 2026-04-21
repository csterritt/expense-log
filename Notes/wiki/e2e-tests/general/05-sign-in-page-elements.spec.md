# 05-sign-in-page-elements.spec.ts

**Source:** `e2e-tests/general/05-sign-in-page-elements.spec.ts`

## Purpose

Common sign-in page element tests that apply to all modes.

## Test cases

- `sign-in page has required form elements` — email-input, password-input, submit are visible; page title contains "Sign In"
- `sign-in page does not have sign-up form elements embedded` — signup-name-input, signup-email-input, signup-password-input are NOT present
- `sign-in page has forgot password link` — forgot-password-action is visible and navigates to `/auth/forgot-password`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
