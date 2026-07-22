## Issue 24: Roll out resilient submit + idempotency to all mutation forms

**Type**: AFK
**Blocked by**: Issue 23

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Extend the resilient-submit enhancement and idempotency backbone — proven on the expense entry/confirmation forms in Issues 19–23 — across every remaining signed-in mutation form.

- Mark the following forms with the enabling `data-*` attribute and render a server-generated hidden `submissionKey`:
  - Expense edit and delete.
  - Category create, rename, merge-confirm, and delete.
  - Tag create, rename, merge-confirm, and delete.
  - Recurring create, edit, and delete.
- Wire each committing handler for the above through `withIdempotency` (from Issue 19), keyed off the submitted `submissionKey`, so a replayed request replays the original outcome instead of writing again.
- Confirm the exhaustion UX (Issue 23) and value-preservation apply to these forms too (their existing sticky-value / flash mechanisms already round-trip on re-render).
- Auth forms (sign-in, sign-up, password reset) are explicitly excluded — see PRD _Out of Scope_.

See PRD section _Resilient form submission_ (Applies-to bullet) and _Forms and validation_ (hidden `submissionKey` bullet).

### How to verify

- **Manual**: for each form family (categories, tags, recurring, expense edit/delete), force a transient failure then success and confirm the normal outcome; then replay a committing POST with the same key and confirm no duplicate row/merge/delete side effect.
- **Automated**: Playwright e2e covering, for at least one form in each family: transient-failure-then-success, and a same-key replay producing no duplicate effect. Integration tests confirming each committing handler routes through `withIdempotency`.

### Acceptance criteria

- [ ] Given any of the listed mutation forms with JS enabled, when a transient failure occurs, then the submission is retried and lands on the normal outcome.
- [ ] Given a committing POST for any listed form is replayed with the same `submissionKey`, then no duplicate row is written and the original outcome is replayed.
- [ ] Given exhaustion on any listed form, then a recoverable inline error is shown with values preserved.
- [ ] Given auth forms, when submitted, then they are not enhanced by resilient submit (out of scope).

### User stories addressed

- User story 73: background submit across all mutation forms
- User story 78: no duplicate writes on retry across all mutation forms

---
