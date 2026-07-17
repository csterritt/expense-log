# src/routes/test/sign-up-mode.ts

Test-only endpoint for checking the current sign-up mode. Entire file stripped in production (`PRODUCTION:STOP`).

## Route Registered

- `GET /test/sign-up-mode` — Returns current sign-up mode as plain text

Returns the value of `c.env.SIGN_UP_MODE` or `SIGN_UP_MODES.NO_SIGN_UP` as fallback. Response is plain text for easy parsing in E2E tests.

## Dependencies

- `../../constants` — `STANDARD_SECURE_HEADERS`, `SIGN_UP_MODES`
- `../../local-types` — `Bindings`
