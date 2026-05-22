# summary-access.ts

**Source:** `src/lib/db/summary-access.ts`

## Status

**Deleted on 2026-05-22.** The file was removed along with the full `/summary` implementation. This page is retained as a historical record.

## Purpose (historical)

Read/write helpers for expense summaries. Used the same `withRetry` + `Result` pattern as `auth-access.ts`. Split from `expense-access.ts` to improve modularity.

## Historical exports

### `summarize(db, filters): Promise<Result<SummaryRow[], Error>>`

- Added in Issue 12. Public wrapper: `withRetry('summarize', () => summarizeActual(db, filters))`.
- Grouped expenses by month or year, category, and tag.
- Supported `from`/`to` date filtering, `categoryId` exact match, and tag filtering (`or`/`and`).
- Returned aggregated `amountCents` (sum) and `count` per group.
- Used `monthKeyEt` and `yearKeyEt` from `et-date.ts` for key generation.

## Cross-references

- [source-code.md](../../../source-code.md) — current source catalog.

---

See [source-code.md](../../../source-code.md) for the full catalog.
