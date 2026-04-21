# workflow-helpers.ts

**Source:** `e2e-tests/support/workflow-helpers.ts`

## Purpose

High-level multi-step workflow helpers that combine navigation, form submission, and verification into complete user journeys.

## Exports

### `completeSignUpFlow(page, user = TEST_USERS.NEW_USER): Promise<void>`

Navigates to sign-up → fills form → submits → verifies await-verification page.

### `completeGatedSignUpFlow(page, code = GATED_CODES.WELCOME, user = TEST_USERS.GATED_USER): Promise<void>`

Navigates to gated sign-up → fills code + user → submits → verifies await-verification page.

### `completeInterestSignUpFlow(page, email): Promise<void>`

Navigates to interest sign-up → fills email → submits → verifies sign-in page with waitlist success alert.

### `completeSignInFlow(page, user = TEST_USERS.KNOWN_USER): Promise<void>`

Navigates to home → clicks sign-in → fills credentials → submits → verifies protected page with success alert.

### `completeForgotPasswordFlow(page, email = TEST_USERS.KNOWN_USER.email): Promise<void>`

Navigates to forgot-password → fills email → submits → verifies waiting-for-reset page with reset-link-sent alert.

### `testDuplicateSignUpFlow(page, user = TEST_USERS.DUPLICATE_USER): Promise<void>`

Signs up once, then attempts duplicate sign-up and verifies the duplicate-email message on the await-verification page.

### `testDuplicateGatedSignUpFlow(page, firstCode, secondCode, user): Promise<void>`

Gated version of duplicate sign-up flow using two different codes.

### `testDuplicateInterestSignUpFlow(page, email): Promise<void>`

Interest version of duplicate flow; verifies the already-on-waitlist message.

### `signUpThenAttemptUnverifiedSignIn(page, user = TEST_USERS.NEW_USER): Promise<void>`

Signs up a new user then immediately tries to sign in without verifying email, expecting the unverified-email error.

## Cross-references

- [navigation-helpers.md](navigation-helpers.md) — navigation functions
- [form-helpers.md](form-helpers.md) — form submission functions
- [page-verifiers.md](page-verifiers.md) — verification functions
- [test-data.md](test-data.md) — `TEST_USERS`, `GATED_CODES`, `ERROR_MESSAGES`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
