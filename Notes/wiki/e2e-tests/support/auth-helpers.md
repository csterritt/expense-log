# auth-helpers.ts

**Source:** `e2e-tests/support/auth-helpers.ts`

## Purpose

Helpers for authentication actions in E2E tests. Wraps sign-in, sign-out, and page verification into reusable functions.

## Exports

### `signOutAndVerify(page): Promise<void>`

Clicks the sign-out action, verifies we land on the sign-out page, then clicks the home button and verifies we're on the startup page.

### `startSignIn(page): Promise<void>`

Clicks the sign-in link on the home page and verifies we're on the sign-in page.

### `signInUser(page, email, password): Promise<void>`

Complete sign-in flow: navigates to home, starts sign-in, fills credentials, submits, and verifies we're on the protected page.

## Cross-references

- [finders.md](finders.md) — `clickLink`, `fillInput`
- [page-verifiers.md](page-verifiers.md) — page verification helpers

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
