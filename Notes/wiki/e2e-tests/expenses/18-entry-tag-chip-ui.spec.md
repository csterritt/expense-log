# 18-entry-tag-chip-ui.spec.ts

**Source:** `e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts`

## Purpose

End-to-end coverage for the tag chip-checkbox UI on the expense entry form. Validates that seeded tags render as alphabetically-ordered chips, that toggling updates native checkboxes, and that selected tags are correctly attached to created expenses.

## Setup

- Signs in as `KNOWN_USER`.
- Seeds a set of tags via test helpers.
- Navigates to the expense entry page.

## Assertions

- `data-testid="tag-chip-checkboxes"` is visible.
- Seeded tags render as chips in alphabetical order (case-insensitive).
- Each chip contains a native checkbox (`type='checkbox'`, `name='tagId'`) with the tag's ULID as `value`.
- Clicking a chip toggles its underlying checkbox.
- Selected chips are visually distinct (different CSS classes) from unselected chips.
- Submitting the form with selected chips attaches those tags to the newly created expense.
- The created expense row on `/expenses` displays the attached tag names.

## Cross-references

- [../../src/components/tag-chip-checkboxes.md](../../src/components/tag-chip-checkboxes.md) — component under test.
- [19-entry-new-tag-confirmation.spec.md](19-entry-new-tag-confirmation.spec.md) — companion test for new-tag confirmation flow.
- [21-entry-no-js-and-broken-js.spec.md](21-entry-no-js-and-broken-js.spec.md) — fallback behavior when JS is disabled.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
