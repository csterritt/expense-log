## Issue 21: Resilient-submit retry, backoff, and failure classification

**Type**: AFK
**Blocked by**: Issue 20

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Add automatic retry to the resilient-submit module for genuine infrastructure failures, while never retrying responses the server deliberately rendered.

- Build the failure-classification predicate: an attempt is **retryable** when the `fetch` promise rejects (network/transport error), the attempt exceeds a client-side timeout (`AbortController` fires), or the final response status is `>= 500`. Everything else is **terminal** — a 2xx confirmation page, a 303 the fetch followed to a success or validation re-render, and any 4xx — and is rendered as-is (Issue 20 behaviour). (The host-served 200 `ErrorPage.html` case is added in Issue 22.)
- Build capped-jittered exponential backoff: base delay, ×2 growth, full jitter, hard cap; a maximum of **five total attempts** (one initial + four retries). Delays are file-level constants using the project's `// PRODUCTION:UNCOMMENT` (real) / `// PRODUCTION:REMOVE` (tiny, for tests) convention.
- Factor the attempt/delay schedule and the classification predicate into a pure function for unit testing.
- Because validation and conflict errors are 303 re-renders in this app, they are classified terminal and shown immediately with no retry.

Reuse the existing `withForcedDbError` hook to produce 5xx responses in e2e.

See PRD section _Resilient form submission_ (failure-classification, backoff, error-handling-parity bullets) and the `resilient-submit` unit-test note in _Module Design_ / _Testing Decisions_.

### How to verify

- **Manual**:
  1. Force a 5xx on the expense POST (forced-DB-error hook); submit; confirm the module retries with growing delays and, once the failure is cleared, lands on the normal success page.
  2. Submit an invalid expense; confirm the validation error is shown immediately with no retry/backoff delay.
- **Automated**: unit tables for the delay schedule (five attempts, ×2 growth, jitter bounds, cap) and the classification predicate (network/timeout/5xx → retry; 2xx/303/4xx → terminal). Playwright e2e: a transient 5xx then success; a validation error shown immediately with no retry.

### Acceptance criteria

- [ ] Given a network/timeout/5xx failure, when the submission runs, then it is retried with capped-jittered exponential backoff up to five total attempts.
- [ ] Given a retry eventually succeeds, when it completes, then the normal success page is shown.
- [ ] Given a validation error (303 re-render), when it returns, then it is shown immediately with no retry.
- [ ] Given the pure schedule/classification function, when unit-tested, then attempt count, growth, jitter bounds, cap, and retry/terminal decisions match the PRD.

### User stories addressed

- User story 74: detect and retry network/timeout/5xx failures
- User story 75: exponential backoff, five total attempts
- User story 79: validation/conflict errors shown immediately, no retry
- User story 82: never retry deliberately-rendered responses

---
