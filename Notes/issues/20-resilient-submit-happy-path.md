## Issue 20: Resilient-submit happy path (expense entry form)

**Type**: AFK
**Blocked by**: Issue 19

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

The client enhancement that submits the expense entry form in the background and renders the server's response in place — the success/terminal path only; retry logic arrives in Issue 21.

- Build `public/js/resilient-submit.js`, auto-initialized via document-level `submit` delegation on forms carrying a specific `data-*` attribute (so it survives DOM swaps).
- On submit: serialize with `FormData` and send via `fetch` (`credentials: 'same-origin'`, `redirect: 'follow'`), preserving existing CSRF behavior. The hidden `submissionKey` from Issue 19 is sent as-is.
- On a terminal, non-error response: take the already-fetched final HTML (`response.text()`), swap it into the document, and update history to `response.url`. This shows the normal success message (the followed 303 already rendered the flash into that HTML), and equally renders a validation re-render or the confirmation page; the delegated handler then governs the confirmation form too.
- Disable the submit control with a "submitting…" state for the duration of the request, preventing duplicate user-initiated submits.
- Degrade gracefully: with JS off, the form submits natively exactly as today. Init failures are swallowed (logged to `console.error` only) and must not block native submission.

Mark the expense entry and confirmation forms with the enabling `data-*` attribute in this issue.

See PRD section _Resilient form submission (client retry + server idempotency)_ (progressive-enhancement, success-handling, in-flight-UX bullets) and the `resilient-submit` module in _Module Design_.

### How to verify

- **Manual**:
  1. With JS enabled, submit a valid expense; confirm the page shows the normal success message and the new row, with no full reload flicker beyond the DOM swap.
  2. Submit an expense that requires the confirmation page; confirm the confirmation page renders in place and its confirm/cancel buttons also flow through the enhanced handler.
  3. Rapidly double-click submit; confirm only one submission fires (button disabled during flight).
  4. Disable JS; confirm the form still submits natively and behaves as before.
- **Automated**: Playwright e2e (JS on) for a successful submit rendering the success message, and a confirmation-page round-trip; a JS-disabled smoke test confirming native submission still works.

### Acceptance criteria

- [ ] Given JS is enabled, when the user submits a valid expense, then the request is sent via fetch and the normal success page/message is shown via DOM swap.
- [ ] Given a submission that returns the confirmation page, when it renders, then the confirmation form is also handled by the resilient-submit module.
- [ ] Given a submission is in flight, when the user clicks submit again, then no second submission is sent.
- [ ] Given JS is disabled, when the user submits, then the form posts natively with unchanged behaviour.

### User stories addressed

- User story 73: background submit on mutation forms
- User story 76: retry success shows the normal post-submit page (success path)
- User story 80: JS-off native fallback
- User story 81: in-flight submit lockout

---
