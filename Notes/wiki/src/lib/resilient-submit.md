# `src/lib/resilient-submit.tsx`

Shared JSX helpers for resilient-submit form wiring introduced during Task 24.

## Exports

- `resilientSubmitProps(target)` supplies the `data-resilient-submit` marker and `data-resilient-submit-target` consumed by `public/js/resilient-submit.js`.
- `renderSubmissionKeyInput(submissionKey)` renders the hidden `submissionKey` control, preserving a server-minted ULID through a submission or confirmation step.
- `renderResilientSubmitScript()` emits the module script that enables the enhanced submit behavior.

## Consumers

Expense, category, tag, and recurring renderers use these helpers so their enhanced forms share the same browser contract. Authentication forms intentionally do not consume them; see the [Idempotency Ledger](../../idempotency-ledger.md).
