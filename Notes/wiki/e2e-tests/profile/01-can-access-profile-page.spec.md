# 01-can-access-profile-page.spec.ts

**Source:** `e2e-tests/profile/01-can-access-profile-page.spec.ts`

## Purpose

Verifies profile page access and content display.

## Test cases

- `can access profile page from user menu when authenticated` — clicks profile link and verifies profile page
- `profile page displays user name and email` — verifies `profile-name` and `profile-email` match `TEST_USERS.KNOWN_USER`
- `profile page shows change password form` — verifies all change-password form elements are present
- `profile page shows humorous question` — verifies `humorous-question` element exists and has content
- `redirects to sign-in when not authenticated` — unauthenticated access redirects to sign-in

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
