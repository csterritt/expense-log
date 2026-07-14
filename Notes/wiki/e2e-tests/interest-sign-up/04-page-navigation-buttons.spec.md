# 04-page-navigation-buttons.spec.ts

**Source:** `e2e-tests/interest-sign-up/04-page-navigation-buttons.spec.ts`

## Purpose

Tests page navigation buttons specific to `INTEREST_SIGN_UP` mode UI. These tests should NOT run in `BOTH_SIGN_UP` mode which has different UI.

## Setup

- `beforeEach` calls `skipIfNotExactMode('INTEREST_SIGN_UP')` to skip in other modes.

## Tests

### Sign-in page shows Join Waitlist button

- Navigates to sign-in page.
- Asserts `go-to-sign-up-action` testid is visible with text containing "Join Waitlist".

### Can navigate between sign-in and interest sign-up pages

- Navigates to sign-in, clicks `go-to-sign-up-action` link.
- Verifies on interest sign-up page.
- Clicks `go-to-sign-in-action` link.
- Verifies back on sign-in page at `/auth/sign-in`.

### Interest sign-up page has correct form elements

- Navigates to interest sign-up page.
- Asserts `interest-email-input`, `interest-action`, `go-to-sign-in-action`, `sign-up-page-banner` are visible.
- Asserts heading contains "Join the Waitlist".

## Cross-references

- [../../src/routes/auth/build-interest-sign-up.md](../../src/routes/auth/build-interest-sign-up.md) — page under test.
- [../../src/routes/auth/build-sign-in.md](../../src/routes/auth/build-sign-in.md) — sign-in page.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
