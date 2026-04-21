# url-validation.ts

**Source:** `src/lib/url-validation.ts`

## Purpose

Prevents open-redirect vulnerabilities by validating callback URLs in email verification and similar flows.

## Export

### `validateCallbackUrl(callbackUrl, requestOrigin): string`

Rules:

1. Missing or empty → returns `PATHS.AUTH.SIGN_IN`
2. Protocol-relative (`//evil.com`) → rejected
3. Relative paths starting with `/` are allowed unless they contain backslashes
4. Absolute URLs are parsed against `requestOrigin` and allowed only if the origins match; path + search + hash are returned
5. Malformed URLs or mismatched origins → fallback `PATHS.AUTH.SIGN_IN`

## Cross-references

- [constants.md](../constants.md) — `PATHS`

---

See [source-code.md](../../source-code.md) for the full catalog.
