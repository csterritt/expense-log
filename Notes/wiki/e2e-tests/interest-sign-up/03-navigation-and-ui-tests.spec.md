# 03-navigation-and-ui-tests.spec.ts

**Source:** `e2e-tests/interest-sign-up/03-navigation-and-ui-tests.spec.ts`

## Purpose

UI and navigation tests for the interest sign-up (waitlist) page.

## Test cases

- `interest sign-up page shows explanatory text` — verifies "We're not accepting new accounts at the moment" message
- `interest sign-up page has correct button texts` — "Join Waitlist" and "Sign In Instead"
- `redirects to protected page when already authenticated` — authenticated users are redirected to `/expenses` (the protected landing page) when they hit the interest sign-up URL
- `preserves email in form when validation fails` — invalid email remains in input after failed submission

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
