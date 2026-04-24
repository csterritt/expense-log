# 07-expense-routes-signed-in.spec.ts

**Source:** `e2e-tests/general/07-expense-routes-signed-in.spec.ts`

## Purpose

For each expense feature route, verifies that a signed-in user gets a 200 response and the expected `<h1>` heading. Also verifies the empty-state message on `/expenses`.

## Test cases

For each `{ path, heading }` in `[ /expenses → 'Expenses', /categories → 'Categories', /tags → 'Tags', /summary → 'Summary', /recurring → 'Recurring' ]`:

- Wraps with `testWithDatabase` for DB isolation
- Signs in with `TEST_USERS.KNOWN_USER` via `submitSignInForm`
- Navigates to the path, asserts response status is `200`
- Asserts the page's first `<h1>` text matches the expected heading

Plus one extra test:

- `signed-in /expenses renders the empty-state message` — asserts `expenses-empty-state` element is visible with text `'No expenses yet'`

## Cross-references

- [../support/test-data.md](../support/test-data.md) — `BASE_URLS`, `TEST_USERS`
- [../support/form-helpers.md](../support/form-helpers.md) — `submitSignInForm`
- [../support/test-helpers.md](../support/test-helpers.md) — `testWithDatabase`
- [../../src/routes/expenses/build-expenses.md](../../src/routes/expenses/build-expenses.md)
- [../../src/routes/build-categories.md](../../src/routes/build-categories.md)
- [../../src/routes/build-tags.md](../../src/routes/build-tags.md)
- [../../src/routes/build-summary.md](../../src/routes/build-summary.md)
- [../../src/routes/build-recurring.md](../../src/routes/build-recurring.md)

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
