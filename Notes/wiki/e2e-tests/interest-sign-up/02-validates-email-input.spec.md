# 02-validates-email-input.spec.ts

**Source:** `e2e-tests/interest-sign-up/02-validates-email-input.spec.ts`

## Purpose

Validates email input on the interest/waitlist sign-up form.

## Test cases

- `shows error for empty email submission` — uses `testRequiredEmailField`
- `shows error for invalid email format` — uses `testEmailValidation`
- `comprehensive form validation` — runs `testInterestSignUpFormValidation`
- `shows error for malformed email` — `test@` is rejected
- `accepts valid email with various formats` — `test.user+tag@example.com`, `user_name@subdomain.example.org`, `simple@test.co` are all accepted

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
