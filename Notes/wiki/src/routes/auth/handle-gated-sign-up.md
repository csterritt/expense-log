# src/routes/auth/handle-gated-sign-up.ts

POST handler for gated sign-up (with invite code).

## Route Registered

- `POST /auth/sign-up` — Gated sign-up with code + name/email/password

## Flow

1. Validates form via `GatedSignUpFormSchema` (includes sign-up code field)
2. Delegates to `processGatedSignUp` which handles code claiming, duplicate detection, and Better Auth registration

## Dependencies

- `../../lib/validators` — `validateRequest`, `GatedSignUpFormSchema`
- `../../lib/sign-up-utils` — `processGatedSignUp`, `GatedSignUpData`
- `../../lib/redirects` — `redirectWithError`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`
