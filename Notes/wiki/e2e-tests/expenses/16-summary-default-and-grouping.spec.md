# 16-summary-default-and-grouping.spec.ts

**Source:** `e2e-tests/expenses/16-summary-default-and-grouping.spec.ts`

## Purpose

2026-05-22 placeholder test. The original Issue 12 spec (month/year grouping, grand total, filter bar) was removed when the full summary implementation was deleted. Issue 17 introduced new summary E2E tests under `e2e-tests/summary/` instead. This file remains a minimal placeholder.

## Test cases

1. **Shows coming soon message** — signs in, navigates to `/summary`, asserts `summary-page` is visible and `Summary coming soon` text is present.

## Cross-references

- [../../src/routes/build-summary.md](../../src/routes/build-summary.md) — route under test.
- [../summary/01-summary-defaults-and-controls.spec.md](../summary/01-summary-defaults-and-controls.spec.md) — Issue 17 replacement spec.

