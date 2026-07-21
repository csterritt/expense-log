# Code Review Findings

Reviewed on 2026-07-18.

Scope: application code, Worker configuration, database access, authentication, validation, recurring jobs, unit tests, E2E tests, and deployment scripts.

## Findings

### 1. High: Production email delivery treats every HTTP response as success

- **Location**: `src/lib/email-service.ts`
- **Issue**: `createTransporter().sendMail` returns the `fetch` response without checking `response.ok`. A 400, 401, 429, or 500 response resolves normally, after which verification and password-reset flows log success.
- **Impact**: Users can be told that verification/reset mail was sent when the provider rejected it. This can strand new users and hide provider outages or bad credentials.
- **Recommendation**: Require a configured URL and code, check `response.ok`, and throw an error containing the status plus a small sanitized response excerpt. Add direct tests for 2xx, 4xx, 5xx, network failure, and missing configuration. The existing `tests/send-email.spec.ts` exercises a different, currently unused SMTP/OTP module.

### 4. Medium: Verification-email resend reveals whether an account exists and is verified

- **Location**: `src/routes/auth/handle-resend-email.ts`
- **Issue**: Unknown emails receive the generic “new verification email” flow, but an existing verified email is redirected to sign-in with “Your email is already verified.” This externally observable branch discloses both account existence and verification status. It also occurs before the rate-limit check.
- **Impact**: Attackers can enumerate verified accounts without authentication or throttling, weakening user privacy and enabling targeted credential attacks.
- **Recommendation**: Return the same status, redirect, message, and approximately equivalent work for unknown, unverified, and verified addresses. Apply a durable IP/email throttle before lookup and keep detailed state only in server logs.

### 7. Medium: Host-specific auth, CSRF, CSP, and cookie settings are duplicated and inconsistent

- **Location**: `src/lib/auth.ts:92-97`, `src/index.ts:101-115`, `src/constants.ts:90-96`, `src/constants.ts:191-213`
- **Issue**: Origins are hard-coded independently in Better Auth, CSRF, CSP, and cookie options. Although the Workers development hostname is treated as trusted and allowed by CSP, application cookies are forced to `expenses.cls.cloud`; they will be rejected on the Workers hostname and localhost. `ALTERNATE_ORIGIN` exists in generated bindings but is unused.
- **Impact**: Flash messages, sticky form state, and manual cookie clearing can silently fail outside the custom domain. Adding or changing a hostname requires synchronized edits in several security-sensitive locations and can easily leave auth and CSRF behavior inconsistent.
- **Recommendation**: Define one validated canonical origin plus an explicit allowlist in environment configuration. Derive Better Auth, CSRF, and CSP values from it. Prefer host-only cookies by omitting `domain` unless cross-subdomain sharing is required, and vary `secure` only for a deliberate local-development mode.

### 8. Medium: Form state is serialized into an unbounded cookie

- **Location**: `src/lib/form-state.ts:54-67`, `src/lib/form-state.ts:74-93`, `src/lib/cookie-support.ts:35-47`
- **Issue**: The complete sticky form plus field errors is JSON-serialized and percent-encoded into one cookie without a byte limit. Encoding can expand the payload substantially, while browser cookies are commonly limited to roughly 4 KiB.
- **Impact**: Larger valid or invalid category/tag submissions can lose all sticky values and errors after redirect, or produce browser/proxy-specific `Set-Cookie` behavior.
- **Recommendation**: Enforce a maximum encoded size and provide a deterministic fallback. Prefer short-lived server-side flash storage keyed by an opaque random token, or retain only bounded fields and reconstruct selectable values from the database. Add a boundary test using the largest body accepted by middleware.

### 9. Low: HMAC confirmation security code and tests are disconnected from production flows

- **Location**: `src/lib/confirmation-hmac.ts:23-119`, `src/routes/expenses/expense-confirm-post-handler.ts:27-104`, `tests/expense-confirm-handler.spec.ts:96-168`
- **Issue**: Production code never imports `confirmation-hmac`; confirmation POSTs revalidate fields but do not sign or verify the confirmation payload. The tests dynamically import and validate the utility in isolation, so they pass while proving nothing about route integration. The generated bindings do not contain the documented `CONFIRMATION_SIGNING_KEY` either.
- **Impact**: The module and its tests create a false impression that confirmation payloads are cryptographically protected and add dead maintenance surface. This is not currently an authorization bypass because the route revalidates input and requires both a session and CSRF protection.
- **Recommendation**: Either remove the unused HMAC module/tests and document revalidation as the intended control, or integrate signing end-to-end, declare the secret binding, bind signatures to user/action/expiry, and add route-level tampering and replay tests.

### 10. Low: Worker binding types and configuration have drifted

- **Location**: `src/local-types.ts:23-43`, `worker-configuration.d.ts:4-22`, `wrangler.jsonc:22-35`
- **Issue**: The project hand-maintains `Bindings` even though Wrangler-generated `Cloudflare.Env` exists. The two disagree: generated bindings include `ASSETS`, `ALTERNATE_ORIGIN`, and `ENABLE_TEST_ROUTES`, while the hand-written interface includes SMTP values absent from the generated environment. The Wrangler config also declares unused empty vars named `Session`, `db`, and `signUpType`.
- **Impact**: Missing or misspelled bindings become runtime failures instead of compile-time errors, and obsolete vars obscure which configuration is actually required.
- **Recommendation**: Use the generated `Cloudflare.Env` (or an intentional extension for test-only injection), remove stale vars, and regenerate types whenever bindings change. Validate only bindings actually used by the active deployment mode.

### 11. Low: Cloudflare compatibility and runtime testing are stale

- **Location**: `wrangler.jsonc:7-18`, `package.json:33-45`, `tests/helpers/test-db.ts:1-80`
- **Issue**: The Worker compatibility date is `2025-05-23`, over a year behind the review date. Unit tests run in Bun with a custom SQLite/D1 approximation; the project does not use `@cloudflare/vitest-pool-workers` or another workerd-based integration suite.
- **Impact**: Runtime-specific differences in D1 batches, Web APIs, compatibility flags, and Worker lifecycle behavior may escape local tests. A stale compatibility date also delays platform fixes and API behavior updates.
- **Recommendation**: Upgrade the compatibility date deliberately after regression testing. Add a small workerd-based integration suite for D1 transactions/batches, bindings, auth cookies, scheduled execution, and nullable platform returns; retain fast Bun tests for pure logic.

## Test Coverage and Quality Gaps

- **Email delivery**: No test imports `src/lib/email-service.ts`; non-2xx provider responses are untested.
- **Worker lifecycle**: No test proves rate limiting across isolates or verifies that mutable global state is absent.
- **Deployment safety**: No automated test exercises `clean-for-production.rb`/deployment output or asserts that test routes are disabled in production.
- **Environment matrix**: Auth, cookies, redirects, and CSRF are not tested on the custom domain, Workers hostname, and localhost as separate configurations.
- **Confirmation integration**: HMAC utility tests do not call any route; route-level replay/tampering behavior is untested.
- **Account enumeration**: Resend-verification tests cover the normal unverified path but not unknown versus verified response equivalence.
- **Static analysis**: There is no lint rule for floating promises, unsafe casts, or mutable Worker globals, and no CI configuration was found.
- **Stale body-limit assertions**: `e2e-tests/general/03-test-body-size-limit.spec.ts:19-38` expects a 2 KiB body to exceed the limit, while `src/index.ts:116-124` configures 4 KiB; the boundary test similarly assumes about 1 KiB.
