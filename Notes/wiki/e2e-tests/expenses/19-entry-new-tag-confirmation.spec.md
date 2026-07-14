# 19-entry-new-tag-confirmation.spec.ts

**Source:** `e2e-tests/expenses/19-entry-new-tag-confirmation.spec.ts`

## Purpose

End-to-end coverage for the new-tag confirmation flow via the tag chip UI on the expense entry form. Validates that new tag names entered in the `newTags` input reach the confirmation page and are created on confirm.

## Setup

- Signs in as `KNOWN_USER`.
- Seeds existing tags and navigates to the expense entry page.

## Assertions

- Typing new tag names in the `newTags` input (`data-testid='new-tags-input'`) and submitting routes to `confirm-create-new-page`.
- The confirmation page lists every new tag name that will be created.
- Mixed comma and whitespace separators in the `newTags` input create all named tags.
- Confirming on the confirmation page creates the new tags and attaches them to the expense.
- Typing an existing tag name in the `newTags` input while that tag's chip is also selected deduplicates — the tag is attached exactly once.
- The created expense row on `/expenses` displays the new tag names.

## Cross-references

- [18-entry-tag-chip-ui.spec.md](18-entry-tag-chip-ui.spec.md) — base tag chip UI behavior.
- [20-entry-tamper-and-error.spec.md](20-entry-tamper-and-error.spec.md) — cancel and error-recovery behavior.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
