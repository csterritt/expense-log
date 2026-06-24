# generate-code.ts

**Source:** `src/lib/generate-code.ts`

## Purpose

Generates cryptographically secure random 8-character alphanumeric tokens for single-use sign-up codes (or similar token use).

## Export

### `generateToken(): Promise<string>`

Generates 8 random alphanumeric characters (A-Z, a-z, 0-9) using `crypto.getRandomValues`. Each byte is mapped to the 62-character alphabet via modulo. Yields ~218 trillion possible tokens.

---

See [source-code.md](../../source-code.md) for the full catalog.
