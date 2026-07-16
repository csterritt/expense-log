# email-utils.ts

**Source:** `src/lib/email-utils.ts`

## Purpose

Shared helpers for normalizing email addresses for storage and lookup.

## Exports

### `normalizeEmail(email: string): string`

Trims and lowercases an email input. `better-auth` stores emails lowercased, so app-level queries and validation must use the same normalized form to match.

## Cross-references

- [sign-up-utils.md](sign-up-utils.md) — uses `normalizeEmail` for duplicate detection and comparison.
- [../routes/auth/handle-forgot-password.md](../routes/auth/handle-forgot-password.md) — normalizes submitted email before processing.

---

See [source-code.md](../../source-code.md) for the full catalog.
