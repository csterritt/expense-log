# src/lib/validators.ts

Valibot schemas for authentication forms and a generic `validateRequest` helper.

## Schemas

### EmailSchema

Validates email: string, 1-254 chars, matches `VALIDATION.EMAIL_PATTERN`.

### SignInSchema

`{ email: EmailSchema, password: string (non-empty) }`

### SignUpFormSchema

`{ name: string (1-100 chars, alphanumeric + hyphens/underscores/spaces), email: EmailSchema, password: string (8-128 chars) }`

### GatedSignUpFormSchema

`{ code: string (8-64 chars, non-empty), name, email, password }` — same name/email/password rules as SignUpFormSchema.

### InterestSignUpFormSchema

`{ email: EmailSchema }`

### ForgotPasswordFormSchema

`{ email: EmailSchema }`

### ResendEmailFormSchema

`{ email: EmailSchema }`

### ResetPasswordFormSchema

`{ token: string (1-512 chars), password: string (8-128), confirmPassword: string (8-128) }` with cross-field validation: password must equal confirmPassword.

### ChangePasswordFormSchema

`{ currentPassword: string (non-empty), newPassword: string (8-128), confirmPassword: string (8-128), userInfo?: string }` with cross-field validation: newPassword must equal confirmPassword.

### PathSignInValidationParamSchema

`{ validationSuccessful?: string (must be 'true') }`

## Functions

### validateRequest(data, schema): [boolean, output | null, error | null]

Generic validation helper. Returns `[true, parsedOutput, null]` on success, `[false, null, errorMessage]` on failure. Error messages are extracted from Valibot issues.

## Dependencies

- `valibot` — schema validation
- `../constants` — `VALIDATION`
