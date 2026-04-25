# validators.ts

**Source:** `src/lib/validators.ts`

## Purpose

All form input validation is done with Valibot schemas. Each schema returns a tuple `[boolean, parsedData | null, errorMessage | null]`.

## Internal helpers

### `validateEmail(value)`

Trims, lowercases, and tests against `VALIDATION.EMAIL_PATTERN`.

### `validateNameCharacters(value)`

Must match `/^[a-zA-Z0-9_\- ]+$/` and be non-empty after trim.

## Exports

### `EmailSchema`

- `string()`
- `minLength(1)`
- `maxLength(254)`
- custom `validateEmail`

### `InterestSignUpFormSchema`

`{ email: EmailSchema }`

### `ForgotPasswordFormSchema`

`{ email: EmailSchema }`

### `SignInSchema`

`{ email: EmailSchema, password: string(minLength(1)) }`

### `SignUpFormSchema`

`{ name, email, password }`

- `name` — `1–100` chars, `validateNameCharacters`
- `email` — `EmailSchema`
- `password` — `8–128` chars

### `GatedSignUpFormSchema`

Same as `SignUpFormSchema` plus `code` (8–64 chars, non-empty).

### `ResendEmailFormSchema`

`{ email: EmailSchema }`

### `ResetPasswordFormSchema`

`{ token, password, confirmPassword }` with a custom validator ensuring `password === confirmPassword`.

### `ChangePasswordFormSchema`

`{ currentPassword, newPassword, confirmPassword, userInfo? }` with a custom validator ensuring `newPassword === confirmPassword`. `userInfo` is an optional non-negative integer string.

### `PathSignInValidationParamSchema`

`{ validationSuccessful?: string('true') }` — optional param for `/auth/sign-in/:validationSuccessful?`.

### `validateRequest(data, schema): [boolean, T | null, string | null]`

Arrow function. Uses `safeParse`. On failure, joins all issue messages. Special-cases `Expected unknown` → returns `VALIDATION.EMAIL_INVALID`.

## Cross-references

- [constants.md](../constants.md) — `VALIDATION` constants

---

See [source-code.md](../../source-code.md) for the full catalog.
