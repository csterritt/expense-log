# 03-page-navigation-buttons.spec.ts

**Source:** `e2e-tests/gated-sign-up/03-page-navigation-buttons.spec.ts`

## Purpose

Navigation element tests on the gated sign-up page.

## Test cases

- `sign-in page shows Create Account button` — `go-to-sign-up-action` is visible with text containing "Create Account"
- `can navigate between sign-in and gated sign-up pages` — sign-in → click `go-to-sign-up-action` → verify on gated sign-up page at `/auth/sign-up` → click `go-to-sign-in-action` → verify back on sign-in page at `/auth/sign-in`
- `gated sign-up page has correct form elements` — verifies `gated-signup-name-input`, `gated-signup-email-input`, `gated-signup-password-input`, `gated-signup-code-input`, `gated-signup-action`, `go-to-sign-in-action` are all visible; heading contains "Create Account"

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
