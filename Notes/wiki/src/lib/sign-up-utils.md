# src/lib/sign-up-utils.ts

Shared utilities for sign-up handlers: duplicate detection, error handling, code claiming, and the `processGatedSignUp` pipeline.

## Types

### GatedSignUpData

`{ code, name, email, password }` — validated gated sign-up form data.

## Functions

### isSyntheticDuplicateResponse(response): boolean

Detects Better Auth's synthetic duplicate response: `{ token: null, user: { emailVerified: false } }`. Used when `requireEmailVerification=true` and a duplicate email is used.

### isDuplicateEmailError(errorMessage): boolean

Checks if an error message indicates a duplicate email (patterns: "already exists", "duplicate", "unique constraint", "email exists").

### isConstraintError(errorMessage): boolean

Checks for database constraint violation patterns.

### getResponseStatus(response): number | null

Extracts HTTP status from Response objects or objects with `status` property.

### extractErrorMessage(error): string

Extracts a string message from unknown error values.

### handleSignUpResponseError(c, response, email, fallbackPath): Response | null

Inspects Better Auth sign-up response for errors. Returns a redirect Response if error detected, `null` if response is clean.

### handleSignUpApiError(c, error, email, fallbackPath): Response

Handles thrown errors from Better Auth sign-up API. Redirects to await-verification for duplicates, error page for other failures.

### updateAccountTimestampAfterSignUp(db, email): Promise\<void\>

Looks up user by email and updates their `accountUpdatedAt` timestamp. Logs errors but does not throw.

### redirectToAwaitVerification(c, email): Response

Sets `EMAIL_ENTERED` cookie and redirects to await-verification page.

### processGatedSignUp(c, data): Promise\<Response\>

Full gated sign-up pipeline:
1. Claims invite code atomically (`claimSingleUseCode`)
2. Checks for existing user
3. Calls Better Auth `signUpEmail` API
4. On failure: releases claimed code
5. On synthetic duplicate: redirects to await-verification
6. On success: updates account timestamp, redirects to await-verification

## Dependencies

- `./redirects` — `redirectWithError`, `redirectWithMessage`
- `./cookie-support` — `addCookie`
- `./db/auth-access` — `getUserIdByEmail`, `updateAccountTimestamp`, `claimSingleUseCode`, `releaseSingleUseCode`
- `./auth` — `createAuth`
- `./email-utils` — `normalizeEmail`
- `../db/client` — `createDbClient`
- `../constants` — `PATHS`, `COOKIES`, `MESSAGES`, `LOG_MESSAGES`
