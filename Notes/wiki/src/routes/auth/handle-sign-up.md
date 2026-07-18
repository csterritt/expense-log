# src/routes/auth/handle-sign-up.ts

POST handler for open sign-up form submissions.

## Route Registered

- `POST /auth/sign-up` — Sign-up with name/email/password

## Flow

1. Validates form via `SignUpFormSchema`
2. Calls Better Auth `auth.api.signUpEmail` with callback URL
3. Handles response errors via `handleSignUpResponseError`
4. Checks for synthetic duplicate response (existing unverified account)
5. On success: updates account timestamp, stores email cookie, redirects to await verification

## Dependencies

- `../../lib/auth` — `createAuth`
- `../../lib/validators` — `validateRequest`, `SignUpFormSchema`
- `../../lib/sign-up-utils` — `handleSignUpResponseError`, `handleSignUpApiError`, `getResponseStatus`, `updateAccountTimestampAfterSignUp`, `redirectToAwaitVerification`, `isSyntheticDuplicateResponse`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/cookie-support` — `addCookie`
- `../../db/client` — `createDbClient`
- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`, `COOKIES`, `MESSAGES`
