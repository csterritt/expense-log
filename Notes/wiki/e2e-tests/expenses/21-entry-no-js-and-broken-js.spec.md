# 21-entry-no-js-and-broken-js.spec.ts

**Source:** `e2e-tests/expenses/21-entry-no-js-and-broken-js.spec.ts`

## Purpose

End-to-end coverage for progressive-enhancement resilience of the tag chip-checkboxes on the expense entry form. Validates that native checkboxes function correctly with JavaScript disabled and when the enhancement module throws.

## Setup

- Signs in as `KNOWN_USER`.
- Seeds existing tags.

## Assertions

### No-JavaScript fallback

- With JS disabled, the entry form renders native checkboxes for each tag.
- Toggling native checkboxes directly works and persists on submit.
- The `newTags` text field submits as plain text and routes to the confirmation page.
- A validation-error round-trip preserves checked chip states.

### Broken-JavaScript resilience

- When `public/js/tag-chip-checkboxes.js` is configured to throw on load, native checkboxes remain functional.
- Form submission succeeds even when the enhancement module fails to initialize.
- The progressive-enhancement pattern ensures server-rendered checkboxes are never hidden or dependent on JS.

## Cross-references

- [18-entry-tag-chip-ui.spec.md](18-entry-tag-chip-ui.spec.md) — base tag chip UI behavior with JS enabled.
- [../../public-js/index.md](../../public-js/index.md) — progressive-enhancement JS modules.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
