# src/routes/profile/build-profile.tsx

Route builder for the profile page. Shows user info, change password form, and delete account link.

## Route Registered

- `GET /profile` — Profile page (requires sign-in)

## Features

- Displays user name and email
- Change password form (current password, new password, confirm) posting to `PATHS.PROFILE`
- "Delete Account" link to confirmation page
- "Question of the Day" — humorous deterministic question based on day of year
- No-cache headers

## Internal Helpers

- `HUMOROUS_QUESTIONS` — array of 13 silly questions
- `getQuestionOfTheDay()` — selects question by day-of-year modulo array length
- `getSignedInUser(c)` — extracts user from context

## Dependencies

- `../../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
- `../../middleware/signed-in-access` — auth guard
- `../../lib/setup-no-cache-headers` — `setupNoCacheHeaders`
- `../build-layout` — `useLayout`
