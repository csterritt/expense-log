# validation-helpers.ts

**Source:** `e2e-tests/support/validation-helpers.ts`

## Purpose

Reusable validation test patterns. Eliminates repeated sequences of "fill invalid value → click submit → verify error message" across spec files.

## Exports

### `testEmailValidation(page, emailInputId, submitButtonId): Promise<void>`

Fills an invalid email and submits, verifying `ERROR_MESSAGES.INVALID_EMAIL`.

### `testRequiredEmailField(page, submitButtonId): Promise<void>`

Submits without filling email, verifying `ERROR_MESSAGES.INVALID_EMAIL`.

### `testRequiredPasswordField(page, submitButtonId): Promise<void>`

Submits without filling password, verifying `ERROR_MESSAGES.PASSWORD_REQUIRED`.

### `testRequiredNameField(page, submitButtonId): Promise<void>`

Submits without filling name, verifying `ERROR_MESSAGES.NAME_REQUIRED`.

### `testRequiredCodeField(page, submitButtonId): Promise<void>`

Submits without filling code, verifying `ERROR_MESSAGES.CODE_REQUIRED`.

### `testInvalidCodeValidation(page, codeInputId, submitButtonId): Promise<void>`

Fills an invalid code and submits, verifying `ERROR_MESSAGES.INVALID_CODE`.

### `testFormValidation(page, config): Promise<void>`

Comprehensive helper that runs all applicable required-field and validation tests based on a `FormValidationConfig` object (which fields exist on the form).

### `testInterestSignUpFormValidation(page): Promise<void>`

Preconfigured `testFormValidation` for the interest sign-up form.

## Cross-references

- [finders.md](finders.md) — `fillInput`, `clickLink`, `verifyAlert`
- [test-data.md](test-data.md) — `INVALID_DATA`, `ERROR_MESSAGES`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
