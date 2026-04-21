# generate-code.ts

**Source:** `src/lib/generate-code.ts`

## Purpose

Generates random 6-digit numeric codes for single-use sign-up (or similar token use). Never starts with zero.

## Export

### `generateToken(): Promise<string>`

Generates `Math.floor(100_000 + Math.random() * 900_000)` in a loop. In test mode, skips `'123456'` and `'999999'`.

---

See [source-code.md](../../source-code.md) for the full catalog.
