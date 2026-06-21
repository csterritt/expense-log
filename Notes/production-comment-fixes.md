# Production Comment Fixes

A review of every source file listed in `tmp/files-list.md` against the
`clean-for-production.rb` cleanup conventions. Each finding below is either:

- a line that **has** a `PRODUCTION:` directive that is wrong/ineffective, or
- a line that **lacks** a `PRODUCTION:` directive that it should have.

The cleanup directives recognised by `clean-for-production.rb` are:

- `// PRODUCTION:REMOVE` — drop this line.
- `// PRODUCTION:REMOVE-NEXT-LINE` — drop this marker line **and** the next line.
- `// PRODUCTION:UNCOMMENT` — uncomment this line. The required form for a `//`
  comment is `<indent>// <code> // PRODUCTION:UNCOMMENT` (note the **second** `//`
  before the directive). The regex only uncomments when that second `//` is present.
- `// PRODUCTION:STOP` — stop emitting any further lines for the file.

> Reminder: the directive keyword must be exactly `PRODUCTION:`. Variants such as
> `PROCESS:` are ignored by the cleaner and silently leave test code in production.

---

## Critical

### `src/lib/email-service.ts`

This production module is the worst offender: it imports from a test-only file and
uses the wrong directive keyword (`PROCESS:` instead of `PRODUCTION:`) on five
lines, so after cleanup the test SMTP detection and the test-file import would all
ship to production.

1. **Line 13 — missing `PRODUCTION:REMOVE`.**
   ```ts
   import { getTestSmtpConfig } from '../routes/test/smtp-config'
   ```
   `src/routes/test/smtp-config.ts` is a test-only file (its import + route
   registration in `src/index.ts` are tagged `PRODUCTION:REMOVE`). This is the only
   production file that imports from `routes/test/`, so it drags the test file into
   the production bundle. Append the directive:
   ```ts
   import { getTestSmtpConfig } from '../routes/test/smtp-config' // PRODUCTION:REMOVE
   ```

2. **Line 41 — wrong keyword AND wrong format (`PROCESS:UNCOMMENT`).**
   Current:
   ```ts
       // false PROCESS:UNCOMMENT
   ```
   - The keyword `PROCESS:UNCOMMENT` is not recognised — the line is never uncommented.
   - Even with the right keyword it lacks the second `//` required by the uncomment
     regex, so it would be emitted unchanged instead of becoming `false`.
   Should be:
   ```ts
       // false // PRODUCTION:UNCOMMENT
   ```
   After cleanup this leaves `const isTestMode =` followed by `    false`.

3. **Lines 44, 45, 46 — wrong keyword (`PROCESS:REMOVE`).**
   ```ts
       env.PLAYWRIGHT === '1' || // Playwright sets this PROCESS:REMOVE
       process.argv.includes('playwright') || // Running via playwright PROCESS:REMOVE
       typeof (globalThis as any).test !== 'undefined' // Test environment PROCESS:REMOVE
   ```
   These must be `PRODUCTION:REMOVE`. As written, they are not removed, so the
   production build keeps the full test-mode detection (and `process.argv`, which is
   not available in the Workers runtime). Lines 42 and 43 already use the correct
   `PRODUCTION:REMOVE`. Fix to:
   ```ts
       env.PLAYWRIGHT === '1' || // Playwright sets this // PRODUCTION:REMOVE
       process.argv.includes('playwright') || // Running via playwright // PRODUCTION:REMOVE
       typeof (globalThis as any).test !== 'undefined' // Test environment // PRODUCTION:REMOVE
   ```
   (Only the `PROCESS:` → `PRODUCTION:` change is strictly required; `REMOVE` does not
   need a leading `//`.)

   With items 2–3 fixed, `getEmailConfig` resolves to:
   ```ts
   const isTestMode =
       false
   ```

4. **Lines 82–98 — missing `PRODUCTION:REMOVE` on the test-override / test-transporter block.**
   Because line 13's import is being removed and `isTestMode` becomes `false` in
   production, the test override and the entire `if (config.isTestMode) { ... }`
   branch are dead code that still references the now-removed `getTestSmtpConfig`
   (compile error) and the test-only `smtpHost`/`smtpPort`. Tag the whole block for
   removal:
   ```ts
     // Check if SMTP config has been overridden for testing   // line 82
     const testOverride = getTestSmtpConfig()                   // 83
     const smtpHost = testOverride?.host || config.smtpHost     // 84
     const smtpPort = testOverride?.port || config.smtpPort     // 85
                                                                // 86 (blank)
     if (config.isTestMode) {                                   // 87
       // Use smtp-tester for testing ...                       // 88-89
       return nodemailer.createTransport({                      // 90
         host: smtpHost,                                        // 91
         port: smtpPort,                                        // 92
         secure: false,                                         // 93
         tls: {                                                 // 94
           rejectUnauthorized: false,                           // 95
         },                                                     // 96
       })                                                       // 97
     }                                                          // 98
   ```
   Add `// PRODUCTION:REMOVE` to lines **82–98** (each line). After cleanup
   `createTransporter` cleanly falls through to the production `return { sendMail ... }`.
   Alternatively, restructure so the test branch is isolated, but line-by-line
   `PRODUCTION:REMOVE` matches the existing convention used elsewhere.

### `src/lib/auth.ts`

5. **Line 103 — malformed `PRODUCTION:UNCOMMENT` (missing closing quote).**
   Current:
   ```ts
       // baseURL: 'https://mini-auth.example.com, // PRODUCTION:UNCOMMENT
   ```
   The string literal is missing its closing quote before the comma. After
   uncommenting this produces:
   ```ts
       baseURL: 'https://mini-auth.example.com,
   ```
   which is a **syntax error** (unterminated string). It should be:
   ```ts
       // baseURL: 'https://mini-auth.example.com', // PRODUCTION:UNCOMMENT
   ```
   (Lines 26–30, 98–101, and 104 in this file are correctly tagged and verified to
   produce valid output.)

---

## Medium

### `src/routes/test/run-cron.ts`

6. **Lines 5, 23, 26 — ineffective standalone `// PRODUCTION:REMOVE` markers.**
   These directives sit on their own lines, so they only delete *themselves*; the
   `export const testRunCronRouter` declaration, the `.post(...)` registration, and
   all imports (including `getCurrentTime`, `materializeRecurring`) remain. The file
   is excluded from production only because its import in `src/index.ts` is tagged
   `PRODUCTION:REMOVE`, so today this is harmless but misleading.
   - Recommended: drop the three stray markers and instead place a single
     `// PRODUCTION:STOP` immediately after the license header (line 4) so the entire
     test-only body is removed by the cleaner, leaving a valid empty module. Or, if
     relying solely on the `index.ts` import removal, delete the stray markers to
     avoid implying partial cleanup.

### `src/routes/test/database.ts`

7. **Lines 321, 414, 470, 522, 620 — ineffective standalone `// PRODUCTION:REMOVE` markers.**
   Same problem as `run-cron.ts`: each marker is on its own line and only removes
   itself, leaving the `interface`/comment that follows intact. They neither fully
   remove the test file nor anything useful. This file is excluded from production via
   the tagged import in `src/index.ts`, so impact is low, but the markers are
   misleading.
   - Recommended: remove the stray markers, or add a single `// PRODUCTION:STOP` after
     the license header so the whole test-only file body is dropped.

---

## Low / Optional

### `src/index.ts`

8. **Lines 223 & 233 — empty conditional left after cleanup.**
   The body of `if (isTestRouteEnabledFlag) { ... }` (lines 224–232) is fully tagged
   `PRODUCTION:REMOVE`, but the `if (isTestRouteEnabledFlag) {` opener (223) and its
   closing `}` (233) are not, leaving:
   ```ts
   if (isTestRouteEnabledFlag) {
   }
   ```
   This is valid (no functional or compile issue; `isTestRouteEnabledFlag` is still
   defined and is `false` in production). Optional cleanup: add
   `// PRODUCTION:REMOVE-NEXT-LINE` above line 223 plus `// PRODUCTION:REMOVE` on the
   closing brace (233), or leave as-is. No action strictly required.

---

## Files reviewed and confirmed correct (no change needed)

These contain `PRODUCTION:` directives that were traced through the cleaner and
produce valid, correct production output:

- `src/index.ts` — imports, `alternateOrigin`, CSRF origin/skip, body-limit, `buildRoot`,
  `showRoutes`, and test-route registrations all tagged correctly (see Low item 8 above).
- `src/constants.ts` — clock/DB-failure paths & cookies, `STANDARD_COOKIE_OPTIONS`
  (`secure`/`domain`), `DURATIONS`, `STANDARD_RETRY_OPTIONS`, and CSP origins.
- `src/lib/time-access.ts` — `UNCOMMENT` block + `STOP` correctly rewrite
  `getCurrentTime` and drop the test-only `setCurrentDelta`/`clearCurrentDelta`.
- `src/lib/auth.ts` — all directives except the malformed line 103 (Critical item 5).
- `src/routes/handle-set-db-failures.ts`, `src/routes/auth/handle-set-clock.ts`,
  `src/routes/auth/handle-reset-clock.ts` — `// } // PRODUCTION:UNCOMMENT` + `STOP`
  turn each handler into a valid no-op; test-only imports tagged `PRODUCTION:REMOVE`.

All other files in `tmp/files-list.md` contain no test-only code and require no
`PRODUCTION:` directives (e.g. `src/scheduled.ts` uses `todayEt()` with no clock
manipulation; `src/lib/po-notify.ts` line 56's `NODE_ENV` check is correct runtime
behaviour for both dev and prod, not a cleanup target).
