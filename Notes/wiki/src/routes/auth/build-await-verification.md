# build-await-verification.tsx

**Source:** `src/routes/auth/build-await-verification.tsx`

## Purpose

Page shown after sign-up to inform the user to check their email for a verification link. Includes a resend-email button.

## Export

### `buildAwaitVerification(app): void`

Route: `GET /auth/await-verification`

### Behavior

1. Reads `EMAIL_ENTERED` cookie for the user's email
2. If no cookie → redirects to `/auth/sign-in` with `'Please sign in to continue.'`
3. Clears the cookie after reading
4. Renders the await-verification page

### Page content

- Card with `data-testid='await-verification-page'`
- Shows the email address (from cookie)
- "Back to Sign In" button (`data-testid='back-to-sign-in-action'`)
- "Resend Email" form (`POST /auth/resend-email`) — `data-testid='resend-email-action'`

## Cross-references

- [handle-resend-email.md](handle-resend-email.md) — processes the resend form

---

See [source-code.md](../../../source-code.md) for the full catalog.
