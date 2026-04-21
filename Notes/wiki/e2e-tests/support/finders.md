# finders.ts

**Source:** `e2e-tests/support/finders.ts`

## Purpose

Low-level element interaction helpers. All other support modules build on these primitives.

## Exports

### `clickLink(page, testId): Promise<void>`

Clicks the first element matching `page.getByTestId(testId)`.

### `fillInput(page, testId, value): Promise<void>`

Fills the first element matching `page.getByTestId(testId)` with `value`.

### `verifyAlert(page, expectedText): Promise<void>`

Asserts that the page's alert role element has exactly `expectedText`.

### `verifyElementExists(page, testId): Promise<boolean>`

Waits for the element and returns `true`; returns `false` if it times out.

### `getElementText(page, testId): Promise<string | null>`

Waits for the element and returns `textContent()`; returns `null` on timeout.

### `isElementVisible(page, testId): Promise<boolean>`

Checks visibility via `locator(...).isVisible()`. Swallows errors and returns `false`.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
