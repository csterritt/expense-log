# gated-sign-up-form.tsx

**Source:** `src/components/gated-sign-up-form.tsx`

## Purpose

Reusable JSX component for the gated sign-up form fields. Shared between `build-gated-sign-up.tsx` and `build-gated-interest-sign-up.tsx`.

## Props

- `emailEntered` — pre-filled email value (from `EMAIL_ENTERED` cookie)

## Fields

- **Sign-up Code** — `name='code'`, `data-testid='gated-signup-code-input'`
- **Name** — `name='name'`, `data-testid='gated-signup-name-input'`
- **Email** — `type='email'`, `name='email'`, `data-testid='gated-signup-email-input'`
- **Password** — `type='password'`, `name='password'`, `minLength=8`, `data-testid='gated-signup-password-input'`
- **Submit** — `data-testid='gated-signup-action'`

All fields have `required` and `autoFocus` on the first field.

## Cross-references

- [routes/auth/build-gated-sign-up.md](../routes/auth/build-gated-sign-up.md)
- [routes/auth/build-gated-interest-sign-up.md](../routes/auth/build-gated-interest-sign-up.md)

---

See [source-code.md](../../source-code.md) for the full catalog.
