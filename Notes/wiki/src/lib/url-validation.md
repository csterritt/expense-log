# src/lib/url-validation.ts

URL validation to prevent open redirect vulnerabilities.

## Functions

### validateCallbackUrl(callbackUrl, requestOrigin): string

Validates a callback URL and returns a safe redirect path. Rules:
- Missing/empty → returns `PATHS.AUTH.SIGN_IN`
- Protocol-relative (`//evil.com`) → returns default
- Relative path starting with `/` (not `//`) and no backslashes → allowed
- Absolute URL with same origin as `requestOrigin` → returns pathname + search + hash
- Anything else → returns default

## Dependencies

- `../constants` — `PATHS`
