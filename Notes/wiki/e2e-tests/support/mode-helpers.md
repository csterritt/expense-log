# mode-helpers.ts

**Source:** `e2e-tests/support/mode-helpers.ts`

## Purpose

Sign-up mode detection and test-skipping logic. Ensures tests only run when the server is configured in the expected mode.

## Exports

### `detectSignUpMode(): Promise<SignUpMode>`

Fetches `http://localhost:3000/test/sign-up-mode` and returns the current mode. Defaults to `'OPEN_SIGN_UP'` on failure.

### `skipIfNotMode(expectedMode): Promise<void>`

Skips the current test (via `test.skip`) if the server's mode doesn't match. Special-cases `BOTH_SIGN_UP` to allow both `GATED_SIGN_UP` and `INTEREST_SIGN_UP` tests.

### `skipIfMode(skipMode): Promise<void>`

Skips the current test if the server is in exactly `skipMode`.

### `skipIfNotExactMode(expectedMode): Promise<void>`

Strict version of `skipIfNotMode` that does NOT allow `BOTH_SIGN_UP` to run `GATED`/`INTEREST` tests.

## Types

### `SignUpMode`

`'OPEN_SIGN_UP' | 'NO_SIGN_UP' | 'GATED_SIGN_UP' | 'INTEREST_SIGN_UP' | 'BOTH_SIGN_UP'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
