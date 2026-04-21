# 02-visit-nonexistent-page.spec.ts

**Source:** `e2e-tests/general/02-visit-nonexistent-page.spec.ts`

## Purpose

Verifies that unknown routes render the 404 page (HTTP 200 with 404 content per project convention).

## Test cases

- `a bad path redirects to a proper 404 page` — navigates to `/this/path/does/not/exist` and verifies 404 page
- `return to home from 404 page works` — navigates to nonexistent path, clicks home button, verifies startup page

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
