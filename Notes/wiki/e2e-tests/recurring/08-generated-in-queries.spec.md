# e2e-tests/recurring/08-generated-in-queries.spec.ts

Issue 14. Confirms generated expense rows participate in description search, category filter, tag filter, and summary totals identically to manually-entered rows.

## Setup

Seeds one manual expense (`Grocery store`, category `food`, tag `work`, 3000 cents) and one Monthly recurring template (`Grocery subscription`, same category + tag, 1500 cents, anchor Mar 1 2024). Sets clock to Mar 15 2024, runs cron (generates 1 row).

## Tests

1. **Description search** — `?description=grocery` → 2 rows.
2. **Category filter** — `?categoryId=<food-id>` → 2 rows.
3. **Tag filter** — `?tagId=<work-id>` → 2 rows.
4. **Summary totals** — `/summary?from=2024-01-01&to=2024-12-31` grand total = `$45.00`, count = 2.

## Cross-references

- [src/lib/db/expense-access.md](../../src/lib/db/expense-access.md)
- [src/routes/test/run-cron.md](../../src/routes/test/run-cron.md)
