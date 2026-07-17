# src/routes/auth/handle-interest-sign-up.ts

POST handler for interest/waitlist sign-up.

## Route Registered

- `POST /auth/interest-sign-up` — Add email to waitlist

## Flow

1. Checks if user already signed in → redirect to expenses
2. Validates email via `InterestSignUpFormSchema`
3. On validation error: stores email in cookie, redirects back with error
4. Normalizes email (trim + lowercase)
5. Calls `addInterestedEmail` to add to waitlist
6. On DB error: redirects with error message
7. If email already on list: redirects with "already on waitlist" message
8. On success: redirects with "thanks for joining" message

## Dependencies

- `../../lib/validators` — `validateRequest`, `InterestSignUpFormSchema`
- `../../lib/db/auth-access` — `addInterestedEmail`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `addCookie`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `MESSAGES`, `COOKIES`
