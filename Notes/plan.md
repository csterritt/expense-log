# Fix Duplicate Email Handling Across All Sign-Up Modes

## Root Cause
When `requireEmailVerification: true`, better-auth returns a **synthetic success response**
`{ token: null, user: { emailVerified: false } }` for duplicate emails instead of throwing.
All sign-up handlers fell through to `redirectToAwaitVerification` (empty message → no alert).

## Fixes Applied
1. Added `isSyntheticDuplicateResponse()` to `src/lib/sign-up-utils.ts`.
2. `src/routes/auth/handle-sign-up.ts` — checks for synthetic duplicate → redirects with
   `MESSAGES.ACCOUNT_ALREADY_EXISTS`. (OPEN_SIGN_UP mode)
3. `src/lib/sign-up-utils.ts` `processGatedSignUp` — same check added.
   (GATED_SIGN_UP and BOTH_SIGN_UP modes)

## Test Results (all modes verified)
- OPEN_SIGN_UP: 78 passed, 43 skipped ✅
- NO_SIGN_UP: 69 passed, 52 skipped ✅
- GATED_SIGN_UP: 76 passed, 45 skipped ✅
- BOTH_SIGN_UP: 85 passed, 36 skipped ✅
