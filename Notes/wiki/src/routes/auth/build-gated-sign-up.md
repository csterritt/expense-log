# build-gated-sign-up.tsx

**Source:** `src/routes/auth/build-gated-sign-up.tsx`

## Purpose

Gated sign-up page (`/auth/sign-up`). Only active in `GATED_SIGN_UP` mode. Requires a single-use code.

## Export

### `buildGatedSignUp(app): void`

Route: `GET /auth/sign-up`

### Behavior

1. Authenticated users are redirected to `/expenses` with `'You are already signed in.'`
2. Renders the gated sign-up form

### Form

Uses the shared `<GatedSignUpForm />` component with `emailEntered` from `EMAIL_ENTERED` cookie.

### Navigation

- "Sign In Instead" link — `data-testid='go-to-sign-in-action'`

## Cross-references

- [components/gated-sign-up-form.md](../../components/gated-sign-up-form.md) — form component
- [handle-gated-sign-up.md](handle-gated-sign-up.md) — POST handler

---

See [source-code.md](../../../source-code.md) for the full catalog.
