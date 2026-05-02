# build-sign-in.tsx

**Source:** `src/routes/auth/build-sign-in.tsx`

## Purpose

Sign-in page builder (`/auth/sign-in`).

## Export

### `buildSignIn(app): void`

Route: `GET /auth/sign-in/:validationSuccessful?`

### Behavior

1. Already-authenticated users are redirected to `/expenses` with `'You are already signed in.'`
2. If `validationSuccessful` path param is `'true'`, renders a success banner: `'Your email has been verified successfully. You may now sign in.'`
3. Otherwise renders the standard sign-in form

### Sign-in form fields

- **Email** — `type='email'`, `data-testid='email-input'`
- **Password** — `type='password'`, `data-testid='password-input'`
- **Submit** — `data-testid='submit'`

### Navigation

- \"Forgot Password?\" link (`/auth/forgot-password`) — `data-testid='forgot-password-action'`
- \"Sign Up\" / \"Join Waitlist\" link — `data-testid='go-to-sign-up-action'`, conditional on `SIGN_UP_MODE`:
  - `NO_SIGN_UP` → hidden entirely
  - `INTEREST_SIGN_UP` → links to `/auth/interest-sign-up` with label \"Join Waitlist\"
  - All other modes → links to `/auth/sign-up` with label \"Create Account\"

## Cross-references

- [local-types.md](../../local-types.md) — `AppContext`
- [lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`

---

See [source-code.md](../../../source-code.md) for the full catalog.
