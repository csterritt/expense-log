# src/lib/email-utils.ts

Shared helper for normalizing email addresses.

## Functions

### normalizeEmail(email): string

Trims and lowercases an email address. Better Auth stores emails lowercased, so app-level queries must use the same normalized form to match.
