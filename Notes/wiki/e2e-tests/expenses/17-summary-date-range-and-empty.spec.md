# 17-summary-date-range-and-empty.spec.ts

**Source:** `e2e-tests/expenses/17-summary-date-range-and-empty.spec.ts`

## Purpose

2026-05-22 placeholder test. The original Issue 12 spec (date-range filtering, empty state, category/tag filters) was removed when the full summary implementation was deleted. This file now asserts the placeholder page renders correctly.

## Test cases

1. **Shows coming soon message** — signs in, navigates to `/summary`, asserts `summary-page` is visible and `Summary coming soon` text is present.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test (now a placeholder).

