# src/routes/auth/handle-gated-interest-sign-up.ts

POST handler for combined gated + interest sign-up. Handles both sign-up with code and waitlist email submission.

## Routes Registered

- `POST /auth/sign-up` — Gated sign-up with code (same as `handle-gated-sign-up.ts`)
- `POST /auth/interest-sign-up` — Waitlist email submission

## Interest Sign-up Flow

1. Checks if user already signed in → redirect to expenses
2. Validates email via `InterestSignUpFormSchema`
3. On validation error: stores email in cookie, redirects back with error
4. Normalizes email (trim + lowercase)
5. Calls `addInterestedEmail` to add to waitlist
6. On DB error: redirects with error message
7. If email already on list: redirects with "already on waitlist" message
8. On success: redirects with "thanks for joining" message

## Dependencies

- `../../lib/validators` — `validateRequest`, `GatedSignUpFormSchema`, `InterestSignUpFormSchema`
- `../../lib/sign-up-utils` — `processGatedSignUp`, `GatedSignUpData`
- `../../lib/db/auth-access` — `addInterestedEmail`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `addCookie`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `COOKIES`
