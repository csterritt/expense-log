## Issue 23: Resilient-submit exhaustion UX (values preserved)

**Type**: AFK
**Blocked by**: Issue 22

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

The end-of-the-line behaviour when all retries fail, on the expense entry form.

- After the fifth failed attempt, stop retrying, re-enable the submit control, and reveal a descriptive, recoverable error banner on the form (with a `data-testid` per project convention). No navigation occurs.
- Because the page never navigated away, every entered value remains exactly as the user left it — text fields, selected tag chips, new-tag text, and new-category text — ready for a manual retry later.
- The banner message tells the user the submission could not be completed and to try again later.

See PRD section _Resilient form submission_ (exhaustion-handling bullet) and user story 77.

### How to verify

- **Manual**:
  1. Force the expense POST to fail on every attempt (forced-DB-error hook and/or a persistent 200 `ErrorPage.html` override).
  2. Fill the form fully — description, amount, category, selected tag chips, a new-tag entry, and a new-category name — then submit.
  3. After the retries exhaust, confirm: a descriptive error banner appears; the submit control is re-enabled; and every field, chip selection, new-tag text, and new-category text is still populated.
  4. Clear the failure and submit again; confirm the normal success page.
- **Automated**: Playwright e2e forcing five consecutive failures; assert the inline error banner is shown and all values (including chip selections and new-tag/new-category text) are preserved; then assert a manual resubmit after clearing the failure succeeds.

### Acceptance criteria

- [ ] Given five consecutive failed attempts, when retries exhaust, then a descriptive recoverable error banner is shown and no navigation occurs.
- [ ] Given exhaustion, when the form re-renders the error, then all field values, tag-chip selections, new-tag text, and new-category text are preserved.
- [ ] Given exhaustion, when it completes, then the submit control is re-enabled for a manual retry.

### User stories addressed

- User story 77: exhaustion error with all values preserved

---
