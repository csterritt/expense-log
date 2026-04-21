# build-gated-interest-sign-up.tsx

**Source:** `src/routes/auth/build-gated-interest-sign-up.tsx`

## Purpose

Combined sign-up page (`/auth/sign-up`). Only active in `BOTH_SIGN_UP` mode. Contains both the gated sign-up form (with code) and the interest/waitlist form on the same page.

## Export

### `buildGatedInterestSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Authenticated users are redirected to `/private` with `'You are already signed in.'`
2. Renders the combined form

### Page layout

- **Gated sign-up** section with `<GatedSignUpForm />` — `data-testid='gated-signup-section'`
- **Divider** (`OR`)
- **Interest/waitlist** section:
  - Email field — `data-testid='interest-email-input'`
  - Submit button — `data-testid='interest-action'`

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [components/gated-sign-up-form.md](../../components/gated-sign-up-form.md)
- [handle-gated-interest-sign-up.md](handle-gated-interest-sign-up.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
