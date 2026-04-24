# build-interest-sign-up.tsx

**Source:** `src/routes/auth/build-interest-sign-up.tsx`

## Purpose

Interest/waitlist sign-up page (`/auth/interest-sign-up`). Only active in `INTEREST_SIGN_UP` mode. Allows visitors to join a waitlist by submitting their email.

## Export

### `buildInterestSignUp(app): void`

Route: `GET /auth/interest-sign-up`

### Behavior

1. Authenticated users are redirected to `/expenses` with `'You are already signed in.'`
2. Renders the interest sign-up form

### Form fields

- **Email** — `type='email'`, `data-testid='interest-email-input'`
- **Submit** — `data-testid='interest-action'`

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [handle-interest-sign-up.md](handle-interest-sign-up.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
