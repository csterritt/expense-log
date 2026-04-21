# build-sign-in.tsx

**Source:** `src/routes/auth/build-sign-in.tsx`

## Purpose

Sign-in page builder (`/auth/sign-in`).

## Export

### `buildSignIn(app): void`

Route: `GET /auth/sign-in/:validationSuccessful?`

### Behavior

1. Already-authenticated users are redirected to `/private` with `'You are already signed in.'`
2. If `validationSuccessful` path param is `'true'`, renders a success banner: `'Your email has been verified! Please sign in.'`
3. Otherwise renders the standard sign-in form

### Sign-in form fields

- **Email** — `type='email'`, `data-testid='signin-email-input'`
- **Password** — `type='password'`, `data-testid='signin-password-input'`
- **Submit** — `data-testid='signin-action'`

### Navigation

- "Forgot Password?" link (`/auth/forgot-password`) — `data-testid='forgot-password-link'`
- "Sign Up" link — conditional on `SIGN_UP_MODE`:
  - `OPEN_SIGN_UP` → `data-testid='go-to-signup-action'`
  - `GATED_SIGN_UP` → `data-testid='go-to-signup-gated-action'`
  - `INTEREST_SIGN_UP` → `data-testid='go-to-interest-signup-action'`

## Cross-references

- [local-types.md](../../local-types.md) — `AppContext`
- [lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`

---

See [source-code.md](../../../source-code.md) for the full catalog.
