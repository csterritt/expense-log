# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

please read through the @[Notes/tasks/18-tag-chipboxes-and-sort-fix.md]  file and do ONLY do Tasks #16 and #17. notify me with the /home/chris/notify-app program when you're done.


### Planner Response

Let me read the task file first.

*Viewed [18-tag-chipboxes-and-sort-fix.md](file:///home/chris/expense-log/Notes/tasks/18-tag-chipboxes-and-sort-fix.md) *

### Planner Response

Now let me understand what tasks 16 and 17 require. Let me explore the relevant existing code and tests to understand what's already in place.

*Listed directory [expenses](file:///home/chris/expense-log/e2e-tests/expenses) *

*Listed directory [expenses](file:///home/chris/expense-log/src/routes/expenses) *

*Viewed [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts) *

*Viewed [build-edit-expense.tsx](file:///home/chris/expense-log/src/routes/expenses/build-edit-expense.tsx) *

### Planner Response

The edit form already has tag-chip support. Let me look at the existing edit expense e2e tests and entry chip UI spec to understand the patterns, then look at what already exists.

*Viewed [09-edit-expense.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/09-edit-expense.spec.ts) *

*Viewed [10-edit-with-new-items.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/10-edit-with-new-items.spec.ts) *

### Planner Response

The existing tests already use `tag-chip-groceries`, `tag-chip-dairy`, `new-tags-input` etc. The edit form seems to already have chip-checkbox functionality. Let me look at [expense-form.tsx](file:///home/chris/expense-log/src/routes/expenses/expense-form.tsx:0:0-0:0) to understand what's already built:

*Viewed [expense-form.tsx](file:///home/chris/expense-log/src/routes/expenses/expense-form.tsx) *

### Planner Response

Good - the edit form already uses `TagChipCheckboxes`. Let me check what the spec file numbering looks like and understand what task 16 wants me to create:

**Task 16 (RED):** Create a new failing Playwright spec for the expense edit form chip-checkbox + new-tag input, mirroring task 14 (the entry form spec at [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0)).

**Task 17 (GREEN):** Wire the edit form — but looking at [build-edit-expense.tsx](file:///home/chris/expense-log/src/routes/expenses/build-edit-expense.tsx:0:0-0:0), it already imports and uses `TagChipCheckboxes` and `parseTagInputs`. So the GREEN step may already be complete. Let me verify what currently exists by running the existing edit tests.

*Viewed [19-entry-new-tag-confirmation.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/19-entry-new-tag-confirmation.spec.ts) *

*Listed directory [support](file:///home/chris/expense-log/e2e-tests/support) *

### Planner Response

Now I have enough context. The task structure is clear:

- **Task 16 (RED):** Write a failing Playwright spec for the edit form chip-checkbox UI, mirroring [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0)
- **Task 17 (GREEN):** Wire the edit form — the code in [build-edit-expense.tsx](file:///home/chris/expense-log/src/routes/expenses/build-edit-expense.tsx:0:0-0:0) already uses `TagChipCheckboxes` and `parseTagInputs`, so the spec should pass once written

Let me set up the todo list and figure out the next file number:

*Updated todo list*

### Planner Response

The existing file [09-edit-expense.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/09-edit-expense.spec.ts:0:0-0:0) already tests some chip behavior in the edit form (pre-selected chips). The new spec for task 16 needs to be numbered to come after [21-entry-no-js-and-broken-js.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/21-entry-no-js-and-broken-js.spec.ts:0:0-0:0) — so `22-edit-tag-chip-ui.spec.ts`. Let me also check the task description says it "mirrors task 14" (the entry chip UI spec), so it needs to assert:
1. Pre-existing tag attachments render as selected chips on initial load
2. Toggling chips off detaches the corresponding tags on save
3. Alphabetical order with wrap
4. Selected chips visually distinct
5. New-tag input works on edit form

*Edited relevant file*

### Planner Response

Now let me run this spec to confirm it **fails** (as required for the RED step). First, let me check how to run the Playwright tests:

*Viewed [package.json](file:///home/chris/expense-log/package.json) *

*Searched filesystem*

*Viewed [playwright.config.ts](file:///home/chris/expense-log/playwright.config.ts) *

*User accepted the command `npx playwright test e2e-tests/expenses/22-edit-tag-chip-ui.spec.ts --reporter=line 2>&1 | tail -40`*

### Planner Response

All 7 tests fail — Playwright browsers aren't installed, which is why they fail (browser executable missing). But this is a Playwright infrastructure issue, not a code issue. The RED requirement says the tests must fail before moving to GREEN. Let me check whether there's an existing dev server to test against, or whether I should install playwright browsers:

*User accepted the command `ls /home/chris/.cache/ms-playwright/ 2>/dev/null | head -20`*

*User accepted the command `which chromium-browser chromium google-chrome 2>/dev/null || echo "none found"`*

*User accepted the command `npx playwright install chromium 2>&1 | tail -20`*

### Planner Response

Good, browsers are installed. Now let me check if there's a dev server running, then run the new spec to confirm it fails for the right reason:

*User accepted the command `ss -tlnp | grep ':3000' 2>/dev/null || echo "no server on 3000"`*

*Viewed [test-helpers.ts](file:///home/chris/expense-log/e2e-tests/support/test-helpers.ts) *

*Searched filesystem*

*Viewed [run-dev.sh](file:///home/chris/expense-log/run-dev.sh) *

### Planner Response

I need to start the dev server to run the e2e tests. Let me start it non-blocking:

*User accepted the command `./run-dev.sh open-sign-up 2>&1 &`*

*Checked command status*

*User accepted the command `ss -tlnp | grep ':3000' 2>/dev/null || echo "no server on 3000"`*

*Checked command status*

### Planner Response

The command exited immediately. Let me check if there's a different way e2e tests are run here:

*Searched filesystem*

*Grep searched codebase*

*Viewed [execute-e2e-tests.sh](file:///home/chris/expense-log/execute-e2e-tests.sh) *

*Viewed [running-the-server.md](file:///home/chris/expense-log/Notes/skills/code-writing/running-the-server.md) *

### Planner Response

The server needs to be running for the e2e tests. Let me start it properly with the background process approach:

*User accepted the command `npm run dev-open-sign-up`*

*Checked command status*

*User accepted the command `ss -tlnp | grep ':3000' 2>/dev/null || echo "no server on 3000"`*

### Planner Response

Server is up. Now let me run the new spec to confirm it fails (RED step):

*User accepted the command `npx playwright test e2e-tests/expenses/22-edit-tag-chip-ui.spec.ts --reporter=line 2>&1 | tail -40`*

### Planner Response

3 tests fail (RED confirmed for those). The failures are:

1. **toggling chip off detaches** — likely failing in the save flow
2. **toggling chip on adds** — same
3. **ULID check** — the tag value is a UUID (`404872d6-...`) not a ULID

Let me check the full output to understand why these fail:

*User accepted the command `npx playwright test e2e-tests/expenses/22-edit-tag-chip-ui.spec.ts --reporter=line 2>&1 | head -80`*

### Planner Response

I see two distinct issues:
1. **Tags not being saved at all** — `expect(tagText).toContain('gift')` fails because `tagText` is `""`. Tags are being dropped on save entirely.
2. **ULID vs UUID** — the seeding is creating tags with UUIDs rather than ULIDs.

These are genuine failures (RED confirmed). Now I need to understand why the ULID test fails — looking at how `seedExpenses` creates tags:

*Viewed [db-helpers.ts](file:///home/chris/expense-log/e2e-tests/support/db-helpers.ts) *

### Planner Response

The seeding uses UUIDs for tags (it was created before ULID migration). The ULID test in [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0) passes, so the entry form's chips must be getting the correct ULID value. Let me check if the seed-expenses endpoint creates tags with UUID or ULID:

*Found code context*

### Planner Response

Found the root causes:

1. **Tags use `crypto.randomUUID()`** in the test seeder — so tag IDs are UUIDs, not ULIDs. The `parseTagInputs` validator filters out non-ULID ids via `filterSyntacticUlids`, which means **chip-checkbox submits a UUID → validator drops it → no tags saved**.

2. The seeder for tags also uses `crypto.randomUUID()`.

This explains all failures:
- Tags not saved after toggling (UUIDs submitted → dropped by ULID validator)
- ULID test fails (tag value is UUID)

The [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0) has the same ULID test and it passes... wait, the output said 4 passed, 3 failed. Let me check what happened with the entry form chip test to understand — how does it pass if the seeder uses UUIDs?

Actually, wait — [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0) has the exact same ULID assertion and it **passes**. But the seeder uses `crypto.randomUUID()`. This is strange. Let me look at the entry form spec more closely — [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0) test "chip inputs have name=tagId and value=<ulid>" passes.

Actually, looking at it differently: the entry form creates a **new** expense so it's selecting chips **before** submitting. When the new expense is created via `createManyAndExpense`, new tag IDs are generated there. But [seedExpenses](file:///home/chris/expense-log/e2e-tests/support/db-helpers.ts:138:0-169:1) creates initial data — the **chips** shown to the user come from `listTags()` which returns what's in the DB. If seeds use UUIDs, then the chips shown have UUID values.

But then the entry form ULID test passes in spec 18... Let me reread — maybe spec 18 fails on the UUID check in the current state too, and that's why it was a "task 14 RED" spec. Let me check what the current pass/fail state is for all related specs:

*User accepted the command `npx playwright test e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts --reporter=line 2>&1 | tail -20`*

### Planner Response

So [18-entry-tag-chip-ui.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts:0:0-0:0) also has 2 failing tests — it's already a partially-incomplete RED state. This confirms the system is using UUIDs when it should use ULIDs.

Now I understand the full picture. The task 16 RED spec I wrote should fail — and it does (3 failures). The task 17 GREEN step requires me to figure out what's needed to make them pass. 

The failures come from the test seeder using `crypto.randomUUID()` instead of ULID for tags. But also, when tests **submit** the form with UUID-based chip values, `parseTagInputs` filters them out. 

Let me think about what task 17 actually needs: **"Wire the expense edit form"** — looking at [build-edit-expense.tsx](file:///home/chris/expense-log/src/routes/expenses/build-edit-expense.tsx:0:0-0:0), it already:
- Uses `TagChipCheckboxes` 
- Uses `parseTagInputs`
- Pre-populates `tagIds` from the loaded expense

The real issue is that the test seeder creates tags with UUID IDs, but the production code (and thus the validator) expects ULID IDs. The seeder needs to be updated to use ULID for tag IDs. Let me check if this is also true for `createTag` in production:

Looking at `tag-access.ts` line 145: `const id = crypto.randomUUID()` — production also uses UUID! This is the root cause. The seeder and production both use UUIDs, but the validator requires ULID format. This is a **pre-existing issue** that the task 16 RED spec surface.

Wait, but the task 16 description says to write a failing spec and then task 17 GREEN fixes it. The GREEN step says: "Write only the minimum needed to turn the task-16 spec green." 

The fix needs to:
1. Change `createTag` to use ULID instead of `crypto.randomUUID()`
2. Change the seeder `seed-expenses` to use ULID for tag IDs
3. Change `createManyAndExpenseActual` to use ULID for new tags
4. Change the seeder `createTagActual` similarly

Actually wait — looking at `createTag` (line 145), `createManyAndExpenseActual` (line 723), and the seed endpoint (line 383) — they all use `crypto.randomUUID()`. But `parseTagInputs` requires ULID format. There must be some other approach...

Let me check what existing tests that **pass** do. The existing [09-edit-expense.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/09-edit-expense.spec.ts:0:0-0:0) test at line 51-53 uses `tag-chip-groceries` and `tag-chip-dairy` with chip-checkboxes, and it passes. Let me check how those tests save — they just check pre-selected chips, not that toggling saves. The save test in [09-edit-expense.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/09-edit-expense.spec.ts:0:0-0:0) keeps groceries (just edits amount) and verifies it. That works.

Actually, [09-edit-expense.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/09-edit-expense.spec.ts:0:0-0:0) line 73-84: changes amount and saves; tag `groceries` should still be there. The chips are pre-checked via the loaded `tagIds`. When submitted, the UUID goes through `parseTagInputs`. If UUIDs are being dropped... then how does the existing test pass?

Let me check more carefully. `test.use({ javaScriptEnabled: false })` is set for [09-edit-expense.spec.ts](file:///home/chris/expense-log/e2e-tests/expenses/09-edit-expense.spec.ts:0:0-0:0). And the chips are pre-checked. When the form is submitted, the UUID chip value is sent. Then `parseTagInputs` gets called with UUID values, which are filtered out. Then `updateExpenseWithTags` is called with empty `tagIds`... but wait the test passes!

Let me check `updateExpenseWithTags`:

*Grep searched codebase*

*Viewed [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts) *

### Planner Response

So [updateExpenseWithTags](file:///home/chris/expense-log/src/lib/db/expense-access.ts:439:0-449:82) **deletes all tag links** then recreates them with the provided `tagIds`. If `tagIds` is empty (because UUIDs got filtered out), then all tags are removed. This confirms: the "toggling chip off detaches" test fails because UUID IDs are filtered → all tags dropped, not just `food`.

Now I understand the full picture. **Task 17 GREEN** requires changing how tag IDs are generated to use ULID instead of UUID in both:
1. Production: `createTag` in `tag-access.ts`  
2. Production: [createManyAndExpenseActual](file:///home/chris/expense-log/src/lib/db/expense-access.ts:674:0-761:1) in [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0)
3. The test seeder: `seed-expenses` endpoint in `database.ts`

Let me also check the existing seeder/helper for recurring and other seeders that create tags:

*Grep searched codebase*

### Planner Response

The entire codebase uses `crypto.randomUUID()` for IDs. The ULID validator in `parseTagInputs` expects ULID format. This is a fundamental mismatch. 

Looking at the task more carefully — the `parseTagInputs` validator uses ULID regex `^[0-9A-HJKMNP-TV-Z]{26}$`. If tags are being generated with `crypto.randomUUID()` (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), the validator filters them all out.

The task description says "Write only the minimum needed to turn the task-16 spec green." The minimum fix is to **change tag ID generation to use ULID** in:
1. [tag-access.ts](file:///home/chris/expense-log/src/lib/db/tag-access.ts:0:0-0:0) → `createTagActual`
2. [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0) → all places that generate new tag IDs (in [createManyAndExpenseActual](file:///home/chris/expense-log/src/lib/db/expense-access.ts:674:0-761:1), [updateManyAndExpenseActual](file:///home/chris/expense-log/src/lib/db/expense-access.ts:527:0-621:1), [createManyAndRecurringActual](file:///home/chris/expense-log/src/lib/db/expense-access.ts:992:0-1077:1), [updateManyAndRecurringActual](file:///home/chris/expense-log/src/lib/db/expense-access.ts:1181:0-1276:1))
3. Test seeder [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts:0:0-0:0) → all places that generate tag IDs

Let me check if there's already a ULID utility in use:

*Grep searched codebase*

*Grep searched codebase*

### Planner Response

ULID is in [package.json](file:///home/chris/expense-log/package.json:0:0-0:0) as a dependency but not yet imported anywhere. The [expense-validators.ts](file:///home/chris/expense-log/src/lib/expense-validators.ts:0:0-0:0) references the ULID regex but doesn't generate ULIDs. Let me check the `ulid` package:

*Grep searched codebase*

### Planner Response

Let me proceed with understanding the ULID package usage:

*Grep searched codebase*

### Planner Response

Good. Now let me look at what `ulid` 3.0.2 exports:

*Searched filesystem*

*Searched filesystem*

*User accepted the command `cat /home/chris/expense-log/node_modules/ulid/dist/index.d.ts`*

### Planner Response

The `ulid` package exports a `ulid()` function. Now I have everything I need to implement task 17 GREEN. The minimum changes needed:

1. **[src/lib/db/tag-access.ts](file:///home/chris/expense-log/src/lib/db/tag-access.ts:0:0-0:0)** — change `createTagActual` to use `ulid()` instead of `crypto.randomUUID()`
2. **[src/lib/db/expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0)** — change the 4 places that generate new tag IDs  
3. **[src/routes/test/database.ts](file:///home/chris/expense-log/src/routes/test/database.ts:0:0-0:0)** — change the test seeder for tags

Let me read the relevant parts of [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0) for full context:

*Viewed [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts) *

*Viewed [tag-access.ts](file:///home/chris/expense-log/src/lib/db/tag-access.ts) *

*Viewed [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts) *

*Viewed [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts) *

### Planner Response

Now I'll make the changes. I need to:
1. Add `ulid` import to [tag-access.ts](file:///home/chris/expense-log/src/lib/db/tag-access.ts:0:0-0:0) and change [createTagActual](file:///home/chris/expense-log/src/lib/db/tag-access.ts:130:0-155:1) to use it
2. Add `ulid` import to [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0) and change the 4 places that generate tag IDs
3. Add `ulid` import to [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts:0:0-0:0) and change the 2 test seeder places that generate tag IDs

*Edited relevant file*

### Planner Response

Now update [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0) — add the `ulid` import and change the 4 places that generate new tag IDs:

*Viewed [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts) *

*Viewed [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts) *

*Viewed [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts) *

### Planner Response

Now I have full context. Let me apply the changes to [expense-access.ts](file:///home/chris/expense-log/src/lib/db/expense-access.ts:0:0-0:0) — add `ulid` import and replace the 4 `crypto.randomUUID()` calls for new tag IDs:

*Edited relevant file*

### Planner Response

Now update the test seeder in [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts:0:0-0:0) to use ULID for tag IDs. I need to add the `ulid` import and fix the 2 places that create tag IDs:

*Viewed [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts) *

### Planner Response

Now I'll update [database.ts](file:///home/chris/expense-log/src/routes/test/database.ts:0:0-0:0) — add `ulid` import and change the 3 places that create tag IDs (seed-expenses line 383, seed-tags line 499, and seed-recurring-templates line 576):

*Edited relevant file*

### Planner Response

Now let me wait for the server to pick up the changes (wrangler dev should hot-reload), then run the tests:

*User accepted the command `sleep 5 && ss -tlnp | grep ':3000'`*

*User accepted the command `npx playwright test e2e-tests/expenses/22-edit-tag-chip-ui.spec.ts --reporter=line 2>&1 | tail -30`*

### Planner Response

All 7 tests pass. Task 17 GREEN is complete. Now let me also run the entry form chip spec (18) to ensure the fix also makes those green:

*User accepted the command `npx playwright test e2e-tests/expenses/18-entry-tag-chip-ui.spec.ts e2e-tests/expenses/09-edit-expense.spec.ts e2e-tests/expenses/10-edit-with-new-items.spec.ts --reporter=line 2>&1 | tail -20`*

### Planner Response

All passing. Let me run the full e2e suite to make sure nothing regressed:

*User accepted the command `npx playwright test --reporter=line 2>&1 | tail -30`*

*User accepted the command `npx playwright test --reporter=line 2>&1 | grep -E '(passed|failed|error)' | tail -10`*

*User accepted the command `npx playwright test --reporter=line 2>&1 | grep -E '[0-9]+ (passed|failed)' | tail -5`*

*User accepted the command `npx playwright test --reporter=list 2>&1 | tail -10`*

*User accepted the command `npx playwright test 2>&1 | grep -E 'passed|failed|Tests' | tail -5`*

*User accepted the command `npx playwright test 2>&1 | grep -c 'passed\|failed'`*

*User accepted the command `npx playwright test 2>&1 | grep -E '^\s+[0-9]' | tail -5`*

*User accepted the command `npx playwright test 2>&1 | grep -E 'Running|✓|✗|×' | tail -10`*

### Planner Response

The output seems to be getting interleaved with the `bun:` errors. Let me run it differently:

*User accepted the command `npx playwright test e2e-tests/ 2>&1 | tail -5`*

### Planner Response

All **30 e2e tests pass**. Let me also run the unit tests:

*User accepted the command `cd tests && bun test 2>&1 | tail -10`*

### Planner Response

All 502 unit tests pass. Now update the todo list and notify:

*Updated todo list*

*User accepted the command `/home/chris/notify-app "Tasks 16 and 17 complete. 30 e2e tests pass, 502 unit tests pass."`*

### Planner Response

## Summary

**Task 16 (RED)** — Created `@/home/chris/expense-log/e2e-tests/expenses/22-edit-tag-chip-ui.spec.ts` with 7 tests mirroring the entry form chip spec:
- Pre-existing tag attachments render as selected chips on initial load
- All seeded tags appear in alphabetical order with flex wrap
- Selected chip is visually distinct from unselected
- Toggling a chip off detaches that tag on save
- Toggling a chip on adds that tag on save
- Chip inputs have `name=tagId` and `value=<ulid>`
- New-tag input is present on the edit form

**Task 17 (GREEN)** — The edit form ([build-edit-expense.tsx](file:///home/chris/expense-log/src/routes/expenses/build-edit-expense.tsx:0:0-0:0)) already used `TagChipCheckboxes` and `parseTagInputs`, but 3 tests were failing because tag IDs were generated as UUIDs (`crypto.randomUUID()`) while the `parseTagInputs` validator requires Crockford base32 ULID format. Fixed by switching to `ulid()` in:
- `@/home/chris/expense-log/src/lib/db/tag-access.ts:146` — [createTagActual](file:///home/chris/expense-log/src/lib/db/tag-access.ts:131:0-156:1)
- `@/home/chris/expense-log/src/lib/db/expense-access.ts` — 4 places that generate new tag IDs in the create/update many functions
- `@/home/chris/expense-log/src/routes/test/database.ts` — 3 places in the test seeders

Result: **30/30 e2e tests pass, 502/502 unit tests pass.**