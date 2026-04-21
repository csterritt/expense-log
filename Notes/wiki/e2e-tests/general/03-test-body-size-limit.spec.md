# 03-test-body-size-limit.spec.ts

**Source:** `e2e-tests/general/03-test-body-size-limit.spec.ts`

## Purpose

Verifies that payloads exceeding the server's body-size limit return HTTP 413 Content Too Large.

## Test cases

- `returns 413 status when JSON payload exceeds size limit` — 2KB JSON payload → 413 with `overflow :(`
- `returns 413 status when form data payload exceeds size limit` — 2KB form data → 413 with `overflow :(`
- `correctly handles payloads at the size limit boundary` — 1023 bytes succeeds, 1025 bytes fails with 413

## Cross-references

- [constants.md](../../../src/constants.md) — `HTML_STATUS.CONTENT_TOO_LARGE`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
