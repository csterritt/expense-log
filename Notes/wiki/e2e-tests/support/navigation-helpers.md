# navigation-helpers.ts

**Source:** `e2e-tests/support/navigation-helpers.ts`

## Purpose

Navigation helpers that combine `page.goto()` with page verification to ensure the browser actually landed on the expected page.

## Exports

### `navigateToHome(page): Promise<void>`

Goes to `/` and verifies startup page banner.

### `navigateToSignIn(page): Promise<void>`

Goes to `/auth/sign-in` and verifies sign-in page banner.

### `navigateToSignUp(page): Promise<void>`

Goes to `/auth/sign-up` and verifies sign-up page banner.

### `navigateToInterestSignUp(page): Promise<void>`

Goes to `/auth/interest-sign-up` (or `/auth/sign-up` in `BOTH_SIGN_UP` mode) and verifies sign-up page banner.

### `navigateToGatedSignUp(page): Promise<void>`

Goes to `/auth/sign-up` and verifies sign-up page banner.

### `navigateToForgotPassword(page): Promise<void>`

Goes to `/auth/forgot-password` and verifies forgot-password page banner.

### `navigateToAwaitVerification(page): Promise<void>`

Goes to `/auth/await-verification` and verifies await-verification page.

### `navigateToWaitingForReset(page): Promise<void>`

Goes to `/auth/waiting-for-reset` and verifies waiting-for-reset page.

### `navigateToPrivatePage(page): Promise<void>`

Goes to `/private` and verifies protected page banner.

### `navigateToProfile(page): Promise<void>`

Goes to `/profile` and verifies profile page.

### `navigateTo404Route(page, route): Promise<void>`

Goes to `/{route}` and verifies 404 page.

## Cross-references

- [page-verifiers.md](page-verifiers.md) — verification functions
- [test-data.md](test-data.md) — `BASE_URLS`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
