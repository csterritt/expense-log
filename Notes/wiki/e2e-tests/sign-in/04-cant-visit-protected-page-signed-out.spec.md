# 04-cant-visit-protected-page-signed-out.spec.ts

**Source:** `e2e-tests/sign-in/04-cant-visit-protected-page-signed-out.spec.ts`

## Purpose

Verifies that unauthenticated users are redirected to sign-in when accessing `/private`.

## Test case

- Directly navigates to `/private`
- Verifies we are redirected to sign-in page
- Verifies alert: `'You must sign in to visit that page'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
