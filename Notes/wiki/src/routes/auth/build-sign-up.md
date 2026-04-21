# build-sign-up.tsx

**Source:** `src/routes/auth/build-sign-up.tsx`

## Purpose

Open sign-up page builder (`/auth/sign-up`). Only active in `OPEN_SIGN_UP` mode.

## Export

### `buildSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Already-authenticated users are redirected to `/private` with `'You are already signed in.'`
2. Renders the open sign-up form

### Sign-up form fields

- **Name** — `data-testid='signup-name-input'`
- **Email** — `type='email'`, `data-testid='signup-email-input'`
- **Password** — `type='password'`, `minLength=8`, `data-testid='signup-password-input'`
- **Submit** — `data-testid='signup-action'`

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [index.md](../../index.md) — registered only in `OPEN_SIGN_UP` mode
- [handle-sign-up.md](handle-sign-up.md) — POST handler for this form

---

See [source-code.md](../../../source-code.md) for the full catalog.
