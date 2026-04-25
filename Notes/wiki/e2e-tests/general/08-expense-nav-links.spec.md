# 08-expense-nav-links.spec.ts

**Source:** `e2e-tests/general/08-expense-nav-links.spec.ts`

## Purpose

Verifies the expense feature header nav links: hidden when signed out, visible when signed in, and each click navigates to the correct page with the expected heading.

## Nav links under test

| `data-testid`    | Path          | Heading      |
| ---------------- | ------------- | ------------ |
| `expenses-nav`   | `/expenses`   | `Expenses`   |
| `categories-nav` | `/categories` | `Categories` |
| `tags-nav`       | `/tags`       | `Tags`       |
| `summary-nav`    | `/summary`    | `Summary`    |
| `recurring-nav`  | `/recurring`  | `Recurring`  |

## Test cases

- `nav links are not visible when signed out` — visits `/`, asserts each nav `getByTestId(...)` has count `0`.
- `nav links are visible when signed in` — signs in with `TEST_USERS.KNOWN_USER`, asserts each nav element is visible.
- For each link: `clicking <testId> navigates to <path>` — signs in, clicks the link, waits for the URL match, asserts the URL contains the path and the `<h1>` heading matches.

All signed-in tests use `testWithDatabase`.

## Cross-references

- [../support/test-data.md](../support/test-data.md) — `BASE_URLS`, `TEST_USERS`
- [../support/form-helpers.md](../support/form-helpers.md) — `submitSignInForm`
- [../support/test-helpers.md](../support/test-helpers.md) — `testWithDatabase`
- [../../src/routes/build-layout.md](../../src/routes/build-layout.md) — defines the nav links

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
