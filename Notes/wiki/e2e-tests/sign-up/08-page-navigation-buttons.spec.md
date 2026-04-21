# 08-page-navigation-buttons.spec.ts

**Source:** `e2e-tests/sign-up/08-page-navigation-buttons.spec.ts`

## Purpose

Verifies navigation buttons and page elements on the sign-in and sign-up pages in `OPEN_SIGN_UP` mode.

## Test cases

- `sign-in page shows Create Account button` — verifies `go-to-sign-up-action` is visible with "Create Account" text
- `can navigate between sign-in and sign-up pages` — clicks sign-up from sign-in, then back to sign-in from sign-up
- `sign-up page has correct form elements` — verifies all sign-up form inputs and buttons
- `sign-in page has correct form elements and navigation` — verifies sign-in form elements, sign-up button visible, sign-up form elements NOT present

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
