## Issue 1A: Remove the `/private` path and redirect to `/expenses` on sign-in

**Type**: Standard
**Blocked by**: Issue 01 (the `/expenses` route must already exist)

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

The app currently has a `/private` landing page that signed-in users are redirected to after a successful sign-in. With the expense-feature routes now in place, `/expenses` becomes the canonical post-sign-in landing page. Remove the `/private` route and redirect all post-sign-in / already-signed-in flows to `/expenses` instead.

Concretely:

- Remove `PATHS.PRIVATE` from `src/constants.ts` and replace every usage with `PATHS.EXPENSES`.
- Update `src/lib/auth.ts` so Better Auth's `redirectTo` is `/expenses`.
- Update `src/routes/auth/better-auth-response-interceptor.ts` so the verified sign-in handler redirects to `PATHS.EXPENSES`.
- Update the "already signed in" redirects in the sign-in / sign-up / gated / interest page builders and handlers so they redirect to `PATHS.EXPENSES`.
- Update the Profile page "Back" link to point at `PATHS.EXPENSES`.
- Delete `src/routes/build-private.tsx` and remove the `buildPrivate` import and call-site in `src/index.ts`.
- Update the dev-only root page (`src/routes/build-root.tsx`) so its "Protected Content" button links to `/expenses` (rename the `data-testid` from `visit-private-action` to `visit-expenses-action`).

Then update the Playwright test support to match:

- Rename `BASE_URLS.PRIVATE` to `BASE_URLS.EXPENSES` (value `http://localhost:3000/expenses`) in `e2e-tests/support/test-data.ts`.
- Update `verifyOnProtectedPage` in `e2e-tests/support/page-verifiers.ts` to assert the presence of the `expenses-page` test-id (the name `verifyOnProtectedPage` remains valid since the post-sign-in landing page is still a protected page).
- Rename `navigateToPrivatePage` to `navigateToExpensesPage` in `e2e-tests/support/navigation-helpers.ts` and have it use `BASE_URLS.EXPENSES`.
- Update every test that used `BASE_URLS.PRIVATE` (`sign-up/04-cannot-access-private-before-verification.spec.ts`, `sign-in/04-cant-visit-protected-page-signed-out.spec.ts`, `sign-in/05-sign-out-successfully.spec.ts`) to use `BASE_URLS.EXPENSES`.
- Update `interest-sign-up/03-navigation-and-ui-tests.spec.ts` so the URL assertion expects `/expenses` instead of `/private`.

### How to verify

- **Manual**:
  1. Sign in as a known user and confirm the browser lands on `/expenses`, showing the "Expenses" heading and the empty-state message.
  2. While signed in, visit `/auth/sign-in`, `/auth/sign-up`, `/auth/interest-sign-up`, or `/auth/gated-sign-up`; confirm each redirects to `/expenses` with the "already signed in" flash message.
  3. Visit `/private` directly; confirm it 404s (or otherwise no longer serves the private landing page).
  4. From the profile page, click "Back" and confirm it navigates to `/expenses`.
- **Automated**: `npx playwright test` passes with the renamed helpers and URL constants; all previously passing sign-in / sign-up / profile / reset-password / interest-sign-up flows continue to pass against the new redirect target.

### Acceptance criteria

- [ ] `PATHS.PRIVATE` no longer exists in `src/constants.ts`; no source or test file references `/private`.
- [ ] `src/routes/build-private.tsx` is deleted and `buildPrivate` is no longer imported or mounted in `src/index.ts`.
- [ ] After a successful email-password sign-in, the user lands on `/expenses`.
- [ ] Already-signed-in visits to any sign-in / sign-up variant page redirect to `/expenses` with the "already signed in" message.
- [ ] `verifyOnProtectedPage` asserts the `expenses-page` test-id, and all Playwright tests pass.

### User stories addressed

- Refines user story 55 (post-sign-in landing) so the protected landing page is the expenses list rather than a placeholder "Private Area".

---
