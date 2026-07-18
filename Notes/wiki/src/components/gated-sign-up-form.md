# src/components/gated-sign-up-form.tsx

Reusable gated sign-up form component with sign-up code, name, email, and password fields.

## Props

- `emailEntered?: string` — Pre-fill email field (default: `''`)
- `autoFocus?: boolean` — Whether to auto-focus the code field (default: `true`)

## Form Fields

- `code` (text, required) — Sign-up invite code
- `name` (text, required) — User's name
- `email` (email, required) — User's email
- `password` (password, required, min 8) — Password

Form posts to `PATHS.AUTH.SIGN_UP` with `noValidate` attribute.

## Dependencies

- `../constants` — `PATHS`, `UI_TEXT`
