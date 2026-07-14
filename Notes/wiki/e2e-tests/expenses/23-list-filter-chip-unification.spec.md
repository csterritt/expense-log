# 23-list-filter-chip-unification.spec.ts

**Source:** `e2e-tests/expenses/23-list-filter-chip-unification.spec.ts`

## Purpose

End-to-end tests verifying that the expense list filter bar uses the shared `tag-chip-checkboxes` component, with consistent class hooks, alphabetical ordering, and correct query-string behavior.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`.
- Signs in `KNOWN_USER` and navigates to `/expenses`.

## Tests

### Filter bar tag chips use the shared chip-checkbox component

- Seeds expenses with 4 tags.
- Asserts `tag-chip-checkboxes` testid is visible inside the filter bar.

### Filter bar tag chips render in alphabetical case-insensitive order with wrap

- Seeds expenses with 4 tags.
- Asserts 4 chips sorted alphabetically with `display: flex`.

### Filter bar tag chips have the same class hooks as entry form chips

- Seeds expenses with 2 tags.
- Asserts both chips have identical CSS classes containing `badge` and `badge-outline`.

### AND/OR toggle and mode=and|or query-string contract are preserved

- Seeds expenses with 2 tags.
- Checks both tag chips, switches to AND mode, submits.
- Asserts URL contains `tagMode=and` and AND radio remains checked.

### Excess tagId values beyond the cap are silently truncated

- Seeds expenses, navigates with 70 duplicate `tagId` params.
- Asserts page renders without error and no `filter-tags-error` element.

### Syntactically-invalid tagId values are silently dropped

- Navigates with invalid `tagId` values (`not-a-valid-ulid`, `also-bad`, `short`).
- Asserts page renders without error.

### Stale tagId values are silently omitted from rendered chip block

- Seeds expenses, navigates with one valid and one nonexistent `tagId`.
- Asserts page renders without error and the nonexistent ID is not in the chip block.

### TagId values on chip inputs have name=tagId and value=ULID format

- Seeds expenses, asserts checkbox inputs have `name="tagId"` and ULID-format `value`.

## Cross-references

- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md) — route under test.
- [../../src/components/tag-chip-checkboxes.md](../../src/components/tag-chip-checkboxes.md) — shared chip-checkbox component.

---

See [e2e-tests.md](../e2e-tests.md) for the full catalog.
