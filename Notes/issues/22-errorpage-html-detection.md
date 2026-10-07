## Issue 22: `ErrorPage.html` (HTTP 200) host-error detection

**Type**: AFK
**Blocked by**: Issue 21

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Teach the resilient-submit module to recognize the host's fallback error page, which the platform serves with an HTTP 200 when the Worker crashes or is unreachable — so it cannot be detected by status code or a cooperating header.

- Add a shared `ErrorPage.html` path constant referenced by both the client module and the tests (single source of truth).
- Extend the failure-classification predicate from Issue 21 so an attempt is also **retryable** when the final response URL resolves to that `ErrorPage.html` path (case-insensitive `pathname` match), even though the status is 200.
- Confirm this identity check runs before the "terminal, render as-is" path, so a 200 `ErrorPage.html` is never mistaken for a legitimate rendered page.

See PRD section _Resilient form submission_ (the `ErrorPage.html` failure-classification bullet and the detection-constant bullet).

### How to verify

- **Manual**:
  1. Using browser devtools/network override, make the expense POST resolve to a 200 `ErrorPage.html`; submit; confirm the module treats it as a failure and retries (rather than swapping in the error page as "success").
  2. Clear the override mid-backoff; confirm a subsequent attempt succeeds and shows the normal success page.
- **Automated**: Playwright e2e using network interception to fulfill the POST with a 200 `ErrorPage.html` response; assert the submission is retried and, once interception is removed, succeeds. Assert the shared path constant is the single detection source.

### Acceptance criteria

- [ ] Given a final response whose URL resolves to the `ErrorPage.html` path with status 200, when classified, then it is treated as a retryable failure.
- [ ] Given the `ErrorPage.html` response persists for all five attempts, then the exhaustion path (Issue 23) is entered rather than rendering the error page as success.
- [ ] Given the client and tests, when checking the error-page identity, then both reference the same shared path constant.

### User stories addressed

- User story 74: detect and retry the host-served 200 `ErrorPage.html` response

---
