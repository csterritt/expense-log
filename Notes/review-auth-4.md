Authorization review

Critical
1. Signup modes can be bypassed through Better Auth’s public API
Location: better-auth-handler.ts:30-42, auth.ts:27-38, index.ts:171-207
Severity: Critical
Pass: Logic errors / Security
Description: SIGN_UP_MODE controls only the custom /auth/sign-up routes. The earlier /api/auth/* catch-all always exposes Better Auth’s POST /api/auth/sign-up/email, while email/password signup remains enabled. An unauthenticated client can therefore bypass:
invitation codes in GATED_SIGN_UP and BOTH_SIGN_UP;
the waitlist in INTEREST_SIGN_UP;
the prohibition on registration in NO_SIGN_UP.
After verifying an email the unauthorized registrant can sign in and access all shared expense data.
Fix: Block the raw HTTP signup endpoint before forwarding requests to Better Auth. The custom handlers can continue calling auth.api.signUpEmail() internally:


ts
app.all('/api/auth/*', async (c) => {
  if (c.req.method === 'POST' && c.req.path === '/api/auth/sign-up/email') {
    return c.notFound()
  }
 
  return createAuth(c.env).handler(c.req.raw)
})
Add an E2E matrix that calls /api/auth/sign-up/email in every mode and verifies no user is created. Existing no-signup tests only exercise /auth/sign-up. 02-sign-up-post-requests-fail.spec.ts:4-42

Medium
2. Revoked or deleted accounts can retain cached authorization
Location: auth.ts:78-84, handle-change-password.ts:63-76, handle-delete-account.ts:39-62
Severity: Medium
Pass: Security / Operation ordering / Magic strings and values
Description: Better Auth’s cookie cache allows a session to be authorized from signed cookie data for five minutes without consulting the deleted/revoked database session. Consequently:
revokeOtherSessions: true does not immediately remove access from other devices;
deleting the user and cascading session rows does not immediately invalidate another device’s cached session;
account deletion manually clears two duplicated, library-internal cookie names only on the current response. Secure production cookies may be prefixed with __Secure-, making these literals unreliable.
A revoked or deleted user may retain protected access until the cache expires.
Fix: Disable cookie caching where immediate revocation is required, or force fresh database validation on every protected request:


ts
session: {
  expiresIn: DURATIONS.THIRTY_DAYS_IN_SECONDS,
  updateAge: DURATIONS.ONE_DAY_IN_SECONDS,
  cookieCache: {
    enabled: false,
  },
},
Use Better Auth’s sign-out/delete response to clear its configured cookies instead of manually naming better-auth.session_token and better-auth.session_data. Add a two-browser-context test proving password changes and deletion immediately invalidate the second context.

3. Enabled test routes form an unauthenticated administrative interface
Location: @/home/chris/expense-log/src/lib/test-routes.ts:20-30, index.ts:120-125, index.ts:221-232, @/home/chris/expense-log/src/routes/test/database.ts:51-71
Severity: Medium
Pass: Security / Bad practices
Description: When test routes are enabled, most test endpoints require no authentication, and /test/* is exempt from CSRF checks. These endpoints can clear or seed the database, alter SMTP behavior, inspect invite codes, and manipulate sessions. The production cleaner is intended to remove them, but any network-accessible development or staging Worker with the flags enabled exposes them to arbitrary callers.
Fix: In addition to compiling them out for production, protect the entire test router with a dedicated test service credential or Cloudflare Access service token. Reject unauthorized requests as not found. Do not rely solely on NODE_ENV and feature flags for destructive endpoints.

4. An interrupted gated signup can permanently strand an invitation
Location: @/home/chris/expense-log/src/db/schema.ts:78-85, @/home/chris/expense-log/src/lib/sign-up-utils.ts:269-301, @/home/chris/expense-log/src/lib/sign-up-utils.ts:303-353
Severity: Medium
Pass: Operation ordering
Description: The handler durably claims the code before account creation. Handled errors attempt to release it, which is a substantial improvement, but Worker termination after the claim—or failure of the compensating release—leaves singleUseCode.email populated permanently. The schema has no claim timestamp, lease expiration, or state distinguishing a completed signup from an abandoned reservation.
Fix: Model the claim as an expiring lease, for example with claimedAt and consumedAt. Permit a claim when it is unused or its lease has expired, then finalize it only after account creation succeeds. Add recovery coverage for an abandoned claim and a failed release.

Low
5. Authorization tests do not cover the actual external boundaries
Location: @/home/chris/expense-log/e2e-tests/general/06-expense-routes-require-auth.spec.ts:7-18, @/home/chris/expense-log/e2e-tests/no-sign-up/01-sign-up-routes-return-404.spec.ts:5-24, @/home/chris/expense-log/e2e-tests/profile/06-delete-account-confirm.spec.ts:14-44
Severity: Low
Pass: Pattern improvements
Description: Current tests cover collection-page GETs and custom signup URLs, but not:
the Better Auth signup API;
unauthenticated mutation and ID-based routes;
immediate session invalidation after password change or deletion;
test-route behavior when disabled or accidentally enabled.
The critical signup bypass can therefore coexist with passing no-signup tests.
Fix: Add a table-driven authorization suite covering every protected method/path, signup API behavior under every mode, and multi-context session revocation. Route grouping under an authenticated Hono sub-app would also reduce reliance on remembering signedInAccess for every new route.
Summary
The ordinary expense, category, tag, recurring, summary, and profile routes consistently apply signedInAccess; no route appears to rely only on hidden UI controls. Database access uses Drizzle expressions rather than interpolated SQL.

I did not flag the lack of per-user expense ownership: the PRD explicitly defines expenses, categories, and tags as shared among all signed-in users. @/home/chris/expense-log/Notes/PRD-expense-log.md:278-282

Top priorities:

Block direct HTTP access to Better Auth’s signup endpoint.
Make account/session revocation immediate rather than cache-delayed.
Add credentials around destructive test routers, even outside production.
No files were changed; this was a static review, so tests were inspected but not executed.
