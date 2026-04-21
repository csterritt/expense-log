# url-validation.spec.ts

**Source:** `tests/url-validation.spec.ts`

## Purpose

Unit tests for `src/lib/url-validation.ts` `validateCallbackUrl`. Prevents open-redirect vulnerabilities.

## Test cases

- `undefined` → returns `DEFAULT_URL` (`/auth/sign-in`)
- `''` (empty string) → returns `DEFAULT_URL`
- `/dashboard` (simple relative) → returns `/dashboard`
- `/profile?tab=settings` (relative with query) → returns unchanged
- `//evil.com/path` (protocol-relative) → rejected → `DEFAULT_URL`
- `https://evil.com/path` (external absolute) → rejected → `DEFAULT_URL`
- `https://example.com/dashboard` (same-origin absolute) → returns `/dashboard`
- `/path\to\evil` (backslashes) → rejected → `DEFAULT_URL`
- `somepath` (no leading slash, same-origin via URL resolution) → returns `/somepath`
- `javascript:alert(1)` → rejected → `DEFAULT_URL`
- `data:text/html,<script>` → rejected → `DEFAULT_URL`
- `/page#section` (hash preserved) → returns `/page#section`
- `https://example.com/page?foo=bar#section` (same-origin with query+hash) → returns `/page?foo=bar#section`

## Dependencies

- `src/lib/url-validation`

---

See [tests.md](../tests.md) for the full catalog.
