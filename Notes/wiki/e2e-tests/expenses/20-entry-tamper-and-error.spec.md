# 20-entry-tamper-and-error.spec.ts

**Source:** `e2e-tests/expenses/20-entry-tamper-and-error.spec.ts`

## Purpose

End-to-end coverage for cancel behavior and tamper/error recovery in the expense entry form when using tag chip-checkboxes. Validates that canceling confirmation preserves state and that tampered `tagId` values show recoverable errors.

## Setup

- Signs in as `KNOWN_USER`.
- Seeds existing tags and navigates to the expense entry page.

## Assertions

### Cancel behavior

- Selecting chips and typing in `newTags`, then navigating to confirmation and clicking Cancel, returns to the entry form.
- All chip selections are preserved after cancel.
- All text in the `newTags` input is preserved after cancel.

### Tamper recovery

- Submitting a non-ULID `tagId` value (simulating tampered form data) shows a recoverable error.
- Submitting an unknown but syntactically valid ULID `tagId` shows a recoverable error.
- In both cases, all other form values (description, amount, date, category, chip selections, `newTags` text) are preserved on the error page.

## Cross-references

- [18-entry-tag-chip-ui.spec.md](18-entry-tag-chip-ui.spec.md) — base tag chip UI behavior.
- [19-entry-new-tag-confirmation.spec.md](19-entry-new-tag-confirmation.spec.md) — new-tag confirmation flow.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
