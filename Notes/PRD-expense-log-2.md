# PRD: Expense Log — Round 2 (Duplicate Detection, Last-Entry Display, Mobile Navigation)

## Problem Statement

Three gaps have shown up in day-to-day use of the expense log:

1. **Duplicate expenses slip in.** Users sometimes enter the same expense twice — either by accident in one sitting, or because one household member logs a purchase that another already logged a few days earlier. The amounts are often not byte-identical (a tip added, a rounding difference, $100.00 vs $100.50) and the dates are often a day or two apart, so the duplicate is hard to spot in the list. Nothing in the app warns the user before the second copy is saved, and duplicates silently inflate totals and summaries.
2. **No clear confirmation of what was just saved.** After a save, the page redirects back to the list with a generic "Expense added." flash. If the expense's date falls outside the current list window, or the list is long, the user cannot easily see *what* they just entered to double-check it.
3. **The navigation bar is cramped on phones.** The header shows five main-page links (Expenses, Categories, Tags, Summary, Recurring) plus Profile, Sign out, and a welcome message as a row of buttons. On a mobile browser this row overflows or wraps awkwardly, making navigation clumsy on the device where quick entry matters most.

## Solution

When this round is complete:

- **Duplicate warning on entry.** When a user submits a new expense through the entry form, the app checks for existing expenses with a similar amount (within the larger of $1.00 or 1% of the larger of the two amounts, inclusive — identical amounts count) and a date within ±4 days (inclusive). If any are found, instead of saving, the app shows a dedicated "Possible duplicates" page listing the pending expense at the top and every potential duplicate below it (closest date first). The user chooses **Save** (save anyway), **Cancel** (back to the form with all values preserved), or **Discard** (back to a cleared form). Duplicate detection runs only for human-entered new expenses — never for edits, deletes, or recurring-generated rows. If the submission also introduces new categories or tags, the duplicates page comes first; the existing "create new category/tags?" confirmation follows only if the user chooses Save. The warning is best-effort: it covers every expense visible to the final pre-commit check; an expense committed concurrently after that check is an accepted race.
- **Last-entry alert.** After an expense is successfully created or edited, the expenses page shows a prominent DaisyUI info alert (outlined) between the entry form and the filter bar/list, containing the expense's current date, description, category, tags, formatted amount, and an Edit link. The existing green "Expense added." / "Expense updated." flash remains. The alert is one-shot per browser: it disappears on the next page render of any kind, including Filter (which includes the description search), Clear filters, or a reload.
- **Responsive navigation.** On viewports narrower than Tailwind's `md` breakpoint (768px), the five main-page links plus Profile collapse into a single native disclosure (`<details>`/`<summary>`) labelled with the current section name and a down-arrow; Welcome text (truncated if necessary) and the Sign out button stay visible beside it. The header fits without horizontal scrolling down to 320px. On `md` and wider, the existing link row is shown unchanged except that the current section's link is visually highlighted. The disclosure works without JavaScript.

## User Stories

### Duplicate detection — detection rules

1. As a signed-in user entering a new expense, I want the app to check whether a similar expense already exists before saving, so that I don't accidentally record the same spend twice.
2. As a signed-in user, I want an existing expense to count as a potential duplicate when its amount is within the larger of $1.00 or 1% of the larger of the two amounts (inclusive), so that small differences like tips or rounding are still caught.
3. As a signed-in user, I want an existing expense with an *identical* amount to count as a potential duplicate (subject to the date rule), so that exact re-entries are caught.
4. As a signed-in user, I want an existing expense to count as a potential duplicate only when its date is within 4 calendar days of the new expense's date, in either direction, inclusive, so that unrelated similar purchases weeks apart are not flagged.
5. As a signed-in user, I want both the amount rule and the date rule to have to hold for a match, so that I am only warned about genuinely suspicious entries.
6. As a signed-in user, I want description, category, and tags to be ignored when deciding whether something is a potential duplicate, so that duplicates entered with different wording or categorization are still caught.
7. As a signed-in user, I want my new entry compared against every existing expense — those entered by any signed-in user and those generated by recurring templates — so that I catch a bill the cron already logged or a purchase another household member already entered.
8. As a signed-in user, when an expense is $50.00 and another is $51.00, I want them flagged (difference $1.00 ≤ $1.00 floor), so that the absolute floor protects small amounts.
9. As a signed-in user, when an expense is $50.00 and another is $51.01, I want them *not* flagged (difference $1.01 > max($1.00, 1% of $51.01 ≈ $0.51)), so that the threshold is predictable.
10. As a signed-in user, when an expense is $1,000.00 and another is $1,010.00, I want them flagged (difference $10.00 ≤ 1% of $1,010.00 = $10.10), so that the percentage rule scales for large amounts.
11. As a signed-in user, when a new expense is dated the 10th, I want expenses dated the 6th through the 14th (inclusive) to be candidates and the 5th or 15th not to be, so that the window is unambiguous — including across month and year boundaries.

### Duplicate detection — the duplicates page

12. As a signed-in user, when one or more potential duplicates exist, I want to be taken to a separate "Possible duplicates" page instead of the expense being saved, so that I can decide before anything is written.
13. As a signed-in user, I want the pending expense (date, description, category, tags, formatted amount) shown at the top of the duplicates page, so that I can compare it side-by-side with the existing ones.
14. As a signed-in user, when the pending expense names a category or tags that do not exist yet, I want them shown as typed on the duplicates page (they are not created yet), so that I see exactly what I entered.
15. As a signed-in user, I want every potential duplicate listed — not just the first — so that I can see all the candidates at once.
16. As a signed-in user, I want each potential duplicate shown the same way as a row in the main expense list (date, description, category, tags, formatted amount, recurring badge for generated rows), but without an Edit button, so that the page is familiar and doesn't lead me out of the decision.
17. As a signed-in user, I want potential duplicates ordered by closest date first, then by smallest amount difference, with a stable final order for otherwise-identical rows, so that the most likely duplicate is at the top and the order never shuffles between renders.
18. As a signed-in user, I want a **Save** action on the duplicates page that saves my expense anyway, so that I can record legitimately similar expenses (e.g., two identical coffees on consecutive days).
19. As a signed-in user, I want a **Cancel** action that returns me to the entry form with every value (description, amount, date, category text, selected tag chips, new-tag text) preserved, so that I can adjust my entry.
20. As a signed-in user, I want a **Discard** action that returns me to a cleared entry form, so that I can abandon a true duplicate in one click.
21. As a signed-in user, after Discard I want a brief flash message confirming that nothing was saved, so that I am confident the duplicate was not recorded.
22. As a signed-in user, after Save I want the normal post-save experience (success flash, last-entry alert, cleared form), so that saving through the duplicates page feels the same as a direct save.
23. As a signed-in user with JavaScript disabled, I want the duplicates page and all three actions to work as plain form posts, so that the feature degrades gracefully.
24. As a signed-in user, if the duplicates page is submitted without a recognised action (missing or unknown `action` value), I want it treated as Cancel — values preserved, nothing saved, submission key untouched — so that a malformed request can never save by default.
25. As a signed-in user, in the unlikely event that more than 200 potential duplicates match, I want the expense not saved and to be returned to the form with all values preserved and an explanatory error, so that I'm never shown a partial list or an unexplained failure.

### Duplicate detection — interaction with new category/tag confirmation

26. As a signed-in user whose submission both introduces a new category or tags and has potential duplicates, I want to see the duplicates page first, so that I don't confirm creating new category/tags for an expense I then discard.
27. As a signed-in user, after choosing Save on the duplicates page for a submission that introduces new category/tags, I want to be taken to the existing "create new items?" confirmation page, so that new items are still explicitly confirmed.
28. As a signed-in user, when I confirm on the new-items page, I want the expense (and the new items I confirmed) saved without being shown the new-items page again, and without being shown the duplicates page again unless a new potential duplicate has appeared, so that I am not asked the same question twice.
29. As a signed-in user, if a new potential duplicate appears between my duplicate approval and my new-items confirmation, I want to see the duplicates page again with the updated list, and on Save have the expense committed directly — without being asked to confirm the same new items a second time — so that the flow terminates.
30. As a signed-in user, if I cancel on the new-items confirmation page after having approved duplicates, I want to return to the entry form with values preserved and my duplicate approval and new-items confirmation forgotten, so that a later resubmission is checked afresh.
31. As a signed-in user whose submission introduces new items but has no potential duplicates, I want the existing new-items confirmation flow unchanged, so that nothing regresses.
32. As a signed-in user, I want no category or tag created until the expense itself is committed, so that abandoning the flow at any step leaves no stray records.

### Duplicate detection — scope boundaries

33. As a signed-in user editing an existing expense, I want no duplicate check, so that edits are never blocked by a warning.
34. As a signed-in user deleting an expense, I want no duplicate check, so that deletes are never blocked.
35. As a signed-in user with recurring templates, I want recurring-generated expenses to be inserted by the cron without any duplicate check, so that scheduled entries always go through unattended.
36. As a signed-in user creating or editing a recurring *template*, I want no duplicate check, so that template management is unaffected.

### Duplicate detection — re-check, replays, races, and failures

37. As a signed-in user, when I choose Save on the duplicates page, I want the server to re-run the duplicate check and, if any potential duplicate now exists that was not on the page I approved, show me the duplicates page again with the updated list, so that I am warned about any expense that became visible since I last looked.
38. As a signed-in user, if a potential duplicate I was shown has since been deleted, or edited such that it no longer matches, I want Save to proceed without re-prompting; if it was edited but still matches, my approval of it still stands, so that changes to rows I've already reviewed don't cause pointless re-confirmation.
39. As a signed-in user, when I confirm the new-items page after approving duplicates, I want the same re-check applied, so that the guarantee holds across the whole flow.
40. As a signed-in user, I accept that if another user (or the cron) commits a matching expense in the instant between my final duplicate check and my commit, both expenses are saved without a warning; the duplicate warning is best-effort, not a lock.
41. As a signed-in user, if the duplicate lookup fails because of a database error, I want the expense *not* saved and to be returned to the form with all values preserved and the message "Failed to save expense. Please try again.", so that a failure never silently saves a possible duplicate.
42. As a signed-in user, when I choose Save, I want every field fully re-validated on the server (hidden fields are not trusted), and any validation failure to return me to the form with values preserved and field errors shown, so that tampered or stale values cannot be saved.
43. As a signed-in user, if a selected tag was deleted between submit and Save, I want the existing recoverable "One or more selected tags no longer exist." error, so that behaviour matches the entry form.
44. As a signed-in user, if any of my create submissions (direct entry, duplicates Save, or new-items confirm) is retried by the resilient-submit layer after the server already committed it, I want the stored success result replayed — same success flash and last-entry alert, one expense — without the retry being re-validated, re-checked for duplicates or new items, or blocked by its own just-committed expense, so that retries look identical to first-time success.
45. As a signed-in user, I want a replayed submission to succeed even if, since the original commit, the matching data changed, a selected tag was deleted, or the duplicate lookup is failing, so that a committed save is never reported as a failure.
46. As a signed-in user, I want a Cancel or Discard action never to consume my submission's idempotency key, so that a later genuine save from the same form still works.
47. As a signed-in user, I want a validation error on the entry form to be reported before any duplicate check, so that I fix typos first and only see the duplicates page for valid entries.
48. As a signed-in user, I want the resilient-submit layer never to retry the duplicates page response (it is a deliberately server-rendered page), so that I am not bounced around by retries.
49. As a signed-in user, I want the duplicates-page Save, Cancel, and Discard requests protected by the app's existing cross-site request protection, so that another site cannot submit them on my behalf.

### Last-entry alert

50. As a signed-in user, after I successfully create an expense (directly, via the new-items confirmation, or via Save on the duplicates page), I want a prominent info alert showing what I just saved, so that I can verify my entry at a glance.
51. As a signed-in user, after I successfully save an edit to an expense, I want the same alert showing the updated expense, so that I can verify the change.
52. As a signed-in user, I want the alert placed between the entry form and the filter bar/expense list, styled as a DaisyUI outlined info alert, so that it is visually distinct from both.
53. As a signed-in user, I want the alert to show the expense's date, description, category, tags, and formatted amount, so that I see everything I entered.
54. As a signed-in user, I want the alert to include an Edit link for that expense, so that I can fix a mistake immediately.
55. As a signed-in user, I want the alert shown even when the saved expense's date falls outside the currently displayed list window, so that I can always see what I entered.
56. As a signed-in user, I want the existing green success flash ("Expense added." / "Expense updated.") to remain alongside the alert, so that the familiar confirmation is unchanged.
57. As a signed-in user, I want the alert removed on my next page render of any kind — Filter (including the description search), Clear filters, visiting another section, or a browser reload — with no automatic timed dismissal, so that it never lingers or vanishes while I'm reading it.
58. As a signed-in user, if my save succeeded but I never saw the expenses page (e.g., the redirect was interrupted) and I then visit another section, I want no stale alert when I later return to the expenses page, so that the alert always refers to the save I just made.
59. As a signed-in user, I want the alert to reflect the expense as it currently exists; if another household member edits it between my save and the page render, I accept seeing their values (the alert is labelled "Last saved", not "You entered"), so that the alert never shows data that no longer exists.
60. As a signed-in user, if the saved expense was deleted (e.g., by another user) before the list page renders, I want no alert and no error, so that the page still loads normally.
61. As a signed-in user, if loading the saved expense for the alert fails unexpectedly, I want the page to render normally without the alert, so that a cosmetic feature never breaks the list.
62. As a signed-in user, if my save was committed but the response was lost and the resilient-submit retry is answered from the idempotency ledger, I want the alert to still appear for the expense that was saved, so that retries look identical to first-time success.
63. As a signed-in user, I want no alert after a validation error, a cancel, a discard, a delete, or any failed save — even if an earlier successful save's alert had not yet been shown — so that the alert always means "this was just saved".
64. As a signed-in user with two tabs open, I accept that the alert is per browser, not per tab: whichever tab renders the expenses page first after a save shows the alert, and a second save before that render replaces the first, so that the mechanism stays simple.
65. As a signed-in user, I want any pending alert discarded when I sign out, so that the next person to sign in on this browser never sees it.
66. As a signed-in user, I want user-entered values in the alert (description, category, tags) HTML-escaped, so that the alert is safe.

### Responsive navigation

67. As a signed-in user on a viewport narrower than 768px, I want the Expenses, Categories, Tags, Summary, Recurring, and Profile links replaced by a single dropdown button, so that the header fits on my phone.
68. As a signed-in user on mobile, I want the dropdown button labelled with the name of the section I'm in, followed by a down-arrow, so that I know where I am and that it opens a menu.
69. As a signed-in user on mobile, I want tapping the button to open a list of the main pages plus Profile, and tapping an item to navigate there, so that I can switch pages in two taps.
70. As a signed-in user on mobile, I want the "Welcome, name!" text and the Sign out button to remain visible outside the dropdown, so that signing out stays one tap away.
71. As a signed-in user on a phone as narrow as 320px, or with a long display name, I want the header to fit without horizontal scrolling — the Welcome text is visually truncated with an ellipsis if needed, with the full name still available on hover and to assistive technology — so that the dropdown and Sign out are always visible and usable.
72. As a signed-in user on a viewport 768px or wider, I want the existing row of links (Expenses, Categories, Tags, Summary, Recurring, Profile, Sign out) and the Welcome text unchanged, so that the desktop experience is not disrupted.
73. As a signed-in user on either layout, I want the link/item for my current section visually highlighted and marked as current for assistive technology — as the current *page* when I'm on that section's landing page, and as the current *section* when I'm on one of its sub-pages — so that I can orient myself accurately.
74. As a signed-in user on a page that belongs to a main section but isn't its landing page (edit expense, duplicates page, new-items confirmation, edit/delete recurring, category/tag merge confirmation), I want the button labelled with the owning section (e.g., "Expenses", "Recurring", "Categories", "Tags"), so that the label still makes sense.
75. As a signed-in user on the Profile page (or its sub-pages), I want the button labelled "Profile", so that the label matches the dropdown item.
76. As a signed-in user on any other page with no owning section, I want the button labelled "Menu", so that it is never blank or misleading.
77. As a signed-in user with JavaScript disabled, I want the dropdown to open, close, and its links to work, so that mobile navigation never depends on scripts.
78. As a signed-in user using a keyboard, I want to Tab to the dropdown button, open and close it with Enter or Space, Tab through every destination link in order when it is open, skip the links entirely when it is closed, and always see a visible focus indicator, so that navigation is fully keyboard-operable.
79. As a signed-in user using a screen reader, I want the dropdown button announced with the current section name and its expanded/collapsed state, and the items announced as ordinary links inside a navigation landmark, so that navigation is understandable.
80. As a signed-in user with JavaScript enabled, I want Escape (returning focus to the button) and a click outside to close an open dropdown, so that dismissal feels natural.
81. As an unauthenticated visitor, I want the navigation unchanged (only the Sign in button), so that this change does not affect public pages.

## Implementation Decisions

### Duplicate matching rules (stable interface, tunable values)

- A *potential duplicate* of a pending expense is any existing expense row where **both**:
  - `|pendingAmountCents − existingAmountCents| ≤ tolerance`, where `tolerance = max(100, round-half-up(1% × max(pendingAmountCents, existingAmountCents)))` (cents, inclusive; identical amounts always match).
  - `|pendingDate − existingDate| ≤ 4` calendar days (inclusive), computed as calendar-day differences on `YYYY-MM-DD` values (no timezone conversion; month/year boundaries and leap years handled correctly).
- **Monetary domain:** amounts are inherited from the existing `parseAmount` contract — integer cents, strictly positive (> 0), at most two decimal places; negatives, zero, and credits are rejected before the matcher runs. The formula therefore operates on positive values only; no signed/magnitude distinction is needed. If credits are ever introduced, the matcher must be revisited.
- Description, category, tags, author, and recurring provenance are not inputs to matching.
- The tolerance values ($1.00 floor, 1%, 4 days) are named code constants owned by the matcher module. The user expects matching rules to change in future (thresholds, or adding description/category similarity), so callers depend only on the matcher's interface, never on the constants or the formula.
- Ordering of matches: ascending absolute day difference, then ascending absolute amount difference, then date descending, then description ascending (case-insensitive), then expense id ascending as the final stable key. The result order is independent of candidate input order.
- **Volume:** the supported working assumption is at most ~100 matches for a single pending expense; realistic household data produces a handful. All matches are rendered and round-tripped — results are never silently truncated. A hard limit of 200 matches (named constant owned by the matcher/pipeline) protects response and request size: above it, the pipeline returns `too-many-matches`, the expense is not saved, and the user is redirected to the form with values preserved and the error "Too many similar expenses to review. Expense not saved." No ledger write occurs.

### Entry pipeline

- The three create entry points — initial entry POST, duplicates-page Save, and new-items confirmation POST — share a single decision function (the *expense entry pipeline*) so the ordering is defined in one place. All three carry the same server-generated `submissionKey` (issued when the entry form is rendered and round-tripped as a hidden field through the duplicates page and the new-items page), so one logical submission has one identity across the whole flow.
- Existing request-level protections run before the pipeline, unchanged: the global Hono `csrf()` origin check, the signed-in middleware (which establishes the user id), and the secure-headers configuration.
- Pipeline steps, in order:
  0. **Replay recognition.** If `submissionKey` is well-formed and the idempotency ledger already holds an outcome for it, return `replay` with the stored outcome immediately — before any validation, tag check, duplicate lookup, or new-item detection. A ledger read failure returns `load-error` (fail closed, nothing saved). An absent/malformed key skips this step (existing contract: never dedupe, never block).
  1. Parse and validate fields (existing validators); on failure → `validation-error` (redirect to the form with field errors and values preserved).
  2. Validate tag input against existing tags (existing contract: unknown/stale `tagId` → recoverable global error).
  3. Duplicate check (honouring the approval rule below). DB failure → `load-error` (fail closed: redirect to the form with "Failed to save expense. Please try again." and values preserved). More than the hard limit → `too-many-matches`.
  4. New-category/new-tag detection (honouring the new-items confirmation rule below); if anything new is not covered by the confirmation → `confirm-new-items`.
  5. `ready-to-commit`. The handler commits through `withAtomicIdempotency`, which retains its existing commit-time guard: the ledger row is inserted in the same D1 batch as the expense, so two concurrent attempts with the same key produce one expense and both receive the stored outcome.
- **Duplicate approval rule:** a submission may carry the set of expense ids the user was shown and approved on the duplicates page. At step 3 the pipeline recomputes matches; if every current match id is in the approved set, the check passes; if any current match is not in the approved set, the duplicates page is rendered again with the fresh list (and the approved set replaced by the new one on that render). Approved ids that no longer match (deleted, or edited out of range) are ignored. Approval is by **row identity**: an approved row that was edited but still matches remains approved; its changed values are not re-reviewed.
- **New-items confirmation rule:** a submission may carry a *confirmed new items* set — the normalized new category name (or none) and new tag names that were displayed on the new-items confirmation page. Posting the new-items confirmation form is what populates it; the entry form and the duplicates page never originate it (the duplicates page only carries forward a set it received). At step 4 the pipeline recomputes which category/tag names are new, using the existing name validation and case-insensitive name matching:
  - Names that now exist (e.g., created by another user meanwhile) resolve to the existing records and need no confirmation.
  - If every remaining new name is in the confirmed set → step 4 passes; the new items are created atomically with the expense at commit (existing `createManyAndExpense` batch).
  - If any remaining new name is not in the confirmed set (tampering, or edited values) → `confirm-new-items` is returned again showing the actual new names.
  - Confirmed names that are no longer submitted are ignored.
  - No category or tag record is ever created before the final commit, and never merely to advance the pipeline.
- **Interaction:** if step 3 re-prompts during a new-items confirmation POST (a new duplicate appeared), the duplicates page carries forward both the fresh approved-id set and the confirmed new-items set. On Save, step 3 passes and step 4 is satisfied by the carried confirmation, so the expense commits without a second new-items page. Cancel on either page drops both sets; Discard drops everything.
- The approved-id set and confirmed new-items set are round-tripped as hidden fields.
- Tampering with either set can at most suppress a warning or confirmation for the tamperer's own submission (all values are still fully re-validated); this is accepted. No HMAC signing, matching the existing new-items confirmation page. Request-origin protection is unaffected by this decision.
- **Concurrency guarantee (best-effort):** the duplicate warning covers every expense committed before the final step-3 lookup of the submission that commits. An expense committed by a different submission (another user, another tab, or the recurring cron) after that lookup and before this commit is not detected; both rows are saved. This race is explicitly accepted — D1 offers no practical way to serialize distinct submissions without a schema change, and the window is milliseconds in a household app. Submission idempotency only deduplicates the *same* submission.
- Edit, delete, recurring template create/edit, and the recurring materializer do not call the pipeline's duplicate step. The recurring materializer is untouched.

### Duplicates page and route

- New authenticated POST route under the expenses section (alongside the existing create-confirmation route), protected by the existing global CSRF origin check, the signed-in middleware, and the secure-headers configuration used by the expenses routes. The initial create route and both confirmation routes are covered by the same CSRF middleware; nothing in this round exempts them.
- The page renders: a heading, the pending expense summary (category and tags shown as typed; new names are not yet created), the list of potential duplicates in the list-row format (including recurring badge, no Edit button), and a form carrying the pending values, `submissionKey`, approved-id set, and (if present) confirmed new-items set as hidden fields, with three submit buttons distinguished by an `action` field: `save`, `cancel`, `discard`.
- `save` → re-enter the pipeline with the approved-id set (and confirmed new-items set, if carried).
- `cancel` → redirect to the expenses page via the existing form-state flash with all values preserved and no errors (same mechanism as the existing confirmation cancel).
- `discard` → redirect to the expenses page with a cleared form and a flash message stating the expense was not saved (wording: "Expense not saved.").
- Missing or unrecognised `action` → handled exactly as `cancel`. It never defaults to `save`.
- Neither `cancel`, `discard`, nor an unrecognised action writes to the idempotency ledger. The `submissionKey` is preserved across the duplicates page and any following new-items confirmation so the final commit remains idempotent.
- The page is a deliberately server-rendered 200 response; the resilient-submit client must treat it like the existing confirmation page (no retry). No change to retry classification is expected, but this must be verified.

### Data access

- New query `findPotentialDuplicates(db, { amountCents, date })` returning `Result<ExpenseRow[], Error>` in the same row shape as the list (including category name, tag names, recurring id). It prefilters in SQL by date range (`date ± 4 days`) and an amount range obtained from the matcher, then applies the matcher for the exact decision and ordering. It uses the existing retrying DB-access helpers and logging discipline (no descriptions/amounts in logs).
- **Prefilter correctness:** because the tolerance depends on the *larger* of the two amounts, the amount bounds must be derived so that every existing amount that could match is inside them in both directions (existing larger or smaller than pending), including the round-half-up boundary. For example, pending $10,000.00 must include existing $10,101.01 (tolerance = round(1% × 1,010,101) = 10,101 cents = difference); a prefilter based only on 1% of the pending amount would wrongly omit it. The bounds may be wider than necessary; the matcher makes the final decision.
- New single-expense read for the alert reuses the existing get-by-id access function (or a thin variant returning the list-row shape with category and tag names).
- **No schema changes.** No migration is required.

### Last-entry alert

- **Semantics:** the alert is a *current-row* display of the expense most recently saved in this browser. It is one-shot per browser (not per tab or per redirect).
- **Cookie:** a dedicated `LAST_ENTRY` cookie containing only the saved expense's id, set with the existing `STANDARD_COOKIE_OPTIONS` (`path=/`, `HttpOnly`, `SameSite=Strict`, `Secure` in production) plus `Max-Age` of 300 seconds so an unconsumed value cannot outlive the session's attention span.
- **Set:** on every successful create commit (direct, new-items confirm, duplicates Save) and every successful edit commit (direct and edit-with-new-items confirm), the handler sets the cookie, then performs the normal post-redirect-get to the expenses page. A `replay` result from pipeline step 0 (or a ledger replay inside the edit path) sets the cookie from the stored outcome exactly as a first-time success would.
- **Clear (invalidation):**
  - The layout renderer clears `LAST_ENTRY` on every page render, signed-in or not, in the same place it already consumes the `MESSAGE_FOUND` flash. Only the expenses GET handler reads it (before the layout clears it) and renders the alert. So any intervening page render — another section, an error page, the duplicates page, the new-items confirmation page — discards a pending alert.
  - Every expense create/edit/delete POST that does not end in a successful commit or replay (validation error, load error, too-many-matches, cancel, discard, unrecognised action, failed commit, delete) clears `LAST_ENTRY` before redirecting.
  - Sign-out clears `LAST_ENTRY`.
- **Concurrent tabs:** last writer wins (a second save overwrites the id), first reader consumes (whichever tab renders any page next clears it). This is accepted; no per-tab token is introduced.
- **Idempotency outcome:** extended with an optional `lastEntryExpenseId`. To make this possible for creates, the expense id is generated in the handler before the commit and passed into the create functions, so the stored outcome is known up front. Outcomes stored before this change (no field) replay without an alert. Outcome parsing must accept both shapes.
- **Render:** the expenses GET handler reads `LAST_ENTRY`, loads that expense fresh from the DB, and renders the alert between the entry form and the filter bar. Missing expense or read failure → no alert, page renders normally (failure logged per existing discipline). Because the current row is read, an edit by another user between commit and render is reflected in the alert; this limitation is accepted and the copy ("Last saved") does not claim the values were the user's own input.
- Filter (including its description search field) and Clear filters are plain GETs, so they render without the alert. No client-side dismissal logic or timer.
- The alert markup is a DaisyUI `alert alert-info alert-outline` with `role="alert"`, containing a "Last saved" label, date, description, category, tags (comma-separated, empty if none), formatted amount (existing money formatter), and an Edit link to that expense's edit page. All values are JSX-escaped.
- The existing success flash ("Expense added." / "Expense updated.") is unchanged and still shown at the top of the layout.
- The edit flow already redirects to the expenses page on success; that stays.

### Responsive navigation

- The layout's signed-in header is rendered by a nav renderer that takes the current section and whether the request path is that section's landing page, both resolved from the request path by a pure resolver.
- Sections: `expenses`, `categories`, `tags`, `summary`, `recurring`, `profile`, `none`. Labels: "Expenses", "Categories", "Tags", "Summary", "Recurring", "Profile", and "Menu" for `none`.
- Resolver mapping by path prefix: the expenses list and every path under the expenses section (edit, delete confirmation, create confirmation, duplicates page) → `expenses`; categories paths (including rename/merge confirmation) → `categories`; tags paths → `tags`; summary → `summary`; recurring paths (create, edit, delete, confirmation) → `recurring`; profile paths → `profile`; anything else (root, 404, auth pages) → `none`. Prefix matching must not mis-assign look-alike paths (match on path-segment boundaries). The resolver also reports `isLanding` (path equals the section's landing path exactly).
- **Mobile (below `md`, 768px):** a native `<details>`/`<summary>` disclosure styled with DaisyUI `dropdown` classes, inside a `<nav aria-label="Main">` landmark:
  - The `<summary>` is the trigger. Its visible text is the current section label followed by an inline SVG chevron marked `aria-hidden="true"`; its accessible name includes the section label (e.g., "Expenses, navigation menu" via visually hidden text). The browser natively exposes and announces expanded/collapsed state and toggles on Enter/Space and click/tap.
  - The panel is a plain `<ul>` of links — Expenses, Categories, Tags, Summary, Recurring, Profile, in that order. It is disclosure-navigation, **not** an ARIA `menu`: no `role="menu"`/`menuitem`, no roving tabindex, no arrow-key model.
  - Focus order: trigger → (when open) each link in order → Welcome/Sign out. When closed, the links are not rendered visible and are not in the tab order (native `<details>` behaviour).
  - Dismissal without JavaScript: activating the trigger again, or navigating via a link. With JavaScript available, a small progressive-enhancement script also closes the disclosure on Escape (returning focus to the trigger) and on a click/tap outside it. Nothing depends on that script.
  - Focus indicators use the visible DaisyUI/Tailwind focus-visible styles; they must not be suppressed.
  - Welcome text and the Sign out form remain visible outside the disclosure. The desktop link row is hidden at this width.
- **Fit at narrow widths:** minimum supported viewport is 320 CSS px (which also covers 200% browser zoom on a 640px window, per WCAG reflow). From 320px to 767px the header must not cause horizontal scrolling. The trigger and Sign out never shrink or wrap off-screen; the Welcome text is the flexible element — it takes the remaining width and is visually truncated with an ellipsis (`truncate` + `min-w-0`). The full "Welcome, name!" string remains in the DOM (so assistive technology reads it in full) and in a `title` attribute.
- **Desktop (`md` and above):** the existing link row (including Profile and Sign out) and Welcome text are shown; the disclosure is hidden.
- **Current-section marking:** the current section's link (desktop) and item (mobile) receive an active visual style. `aria-current="page"` is used only when `isLanding` is true; on a sub-page of the section (edit expense, duplicates page, recurring edit, etc.) the link gets `aria-current="true"` (current item within a set), since the landing link is not the page being viewed. Section `none` marks nothing.
- Existing `data-testid` values on desktop links are retained; mobile elements get distinct test ids (e.g., a nav-dropdown trigger id and per-item ids) so both layouts are independently testable.
- Unauthenticated header (Sign in button only) is unchanged.
- Responsiveness is implemented purely with Tailwind responsive utilities; no user-agent sniffing.

## Module Design

### 1. Duplicate Matcher

- **Name**: Duplicate matcher
- **Responsibility**: Owns the definition of "potential duplicate" — tolerance constants, the amount/date rules, result ordering, the SQL prefilter bounds, and the match-count hard limit.
- **Interface**: Given a pending `{ amountCents, date }` and a list of candidate expense rows, returns the subset that are potential duplicates, ordered by closest date, then smallest amount difference, then date descending, description (case-insensitive), and expense id. Also exposes the SQL prefilter bounds (date range and a conservative amount range valid in both directions) for the lookup to use, so the lookup never re-derives the formula. Pure; no failure modes beyond typed input. The rules/constants are expected to change; the function signatures are stable.
- **Tested**: Yes (unit) — boundary cases at exactly $1.00 / $1.01, 1% vs floor crossover, identical amounts, ±4 vs ±5 days, month/year/leap-year boundaries, rounding of the 1% term, ordering and tiebreaks (including rows identical on every key except id, with candidate input order reversed producing the same id order), and prefilter bounds containing every matching amount in both directions at rounding boundaries (e.g., $10,000.00 ↔ $10,101.01).

### 2. Duplicate Lookup

- **Name**: Duplicate lookup (data access)
- **Responsibility**: Fetches candidate expense rows from the database and returns the matcher-filtered, ordered potential duplicates.
- **Interface**: `findPotentialDuplicates(db, { amountCents, date })` → `Result<ExpenseRow[], Error>` in list-row shape. Errors are DB/transport failures only.
- **Tested**: Yes (unit, against the test DB) — includes manual rows, recurring-generated rows, and rows created by a different user; excludes out-of-window rows; includes the higher-amount boundary row that a pending-only 1% prefilter would miss (both submission directions); returns correct row shape with category and tags; returns an error under forced DB failure.

### 3. Expense Entry Pipeline

- **Name**: Expense entry pipeline
- **Responsibility**: Single source of truth for the create-flow decision order: replay recognition → validate → tag checks → duplicate check (honouring the approved-id set) → new-items detection (honouring the confirmed new-items set) → ready to commit.
- **Interface**: Input: raw form values (including `submissionKey`, optional approved-id set, optional confirmed new-items set). Output: a discriminated result — `replay` (stored outcome, including optional `lastEntryExpenseId`), `validation-error` (field errors + preserved values), `load-error` (fail-closed DB/ledger failure), `too-many-matches` (preserved values), `duplicates` (pending values + ordered matches + new approved-id set + carried confirmed new-items set), `confirm-new-items` (data for the existing confirmation page, carrying the approved-id set), or `ready-to-commit` (resolved category/tags, new items to create, values). Handlers map each variant to a response; the commit itself stays in the handlers via `withAtomicIdempotency`.
- **Tested**: Yes (unit, against the test DB) — each variant; replay short-circuits before validation/duplicate/new-item checks (including when the just-committed expense would otherwise match, a selected tag was deleted, or the duplicate lookup is forced to fail); the ordering (validation before duplicates; duplicates before new items); approval suppression; re-prompt when a new match appears; approved-but-deleted ids ignored; approved-but-edited-still-matching ids stay approved; fail-closed on lookup error; result after new-items confirmation is `ready-to-commit` (not `confirm-new-items` again); confirmation not covering a submitted new name re-prompts; new-items confirmation interrupted by a new duplicate, then Save, reaches `ready-to-commit` with no second confirmation and no category/tag rows created before commit; too-many-matches above the hard limit.

### 4. Duplicates Page and Handler

- **Name**: Duplicates page + POST handler
- **Responsibility**: Renders the possible-duplicates page and handles its Save / Cancel / Discard actions.
- **Interface**: Renderer takes pending values, resolved display names, the ordered matches, the approved-id set, the optional confirmed new-items set, and the `submissionKey`. The handler reads `action`; `save` delegates to the pipeline; `cancel`, `discard`, and missing/unknown actions redirect as specified. Failure modes are the pipeline's.
- **Tested**: Yes — unit for action dispatch (including missing/unknown action → cancel with no ledger write); E2E for the flows.

### 5. Last-Entry Flash

- **Name**: Last-entry flash
- **Responsibility**: Carries "which expense was just saved" from a successful commit (or replay) to the next expenses-page render, invalidates it on any other render or non-saving POST, and renders the alert.
- **Interface**: Set (context, expenseId), clear (context), read-and-clear (context) → expenseId or nothing; alert renderer takes an expense list row. The idempotency outcome type gains an optional `lastEntryExpenseId`, and outcome parsing accepts outcomes with or without it. A missing expense or read failure yields no alert.
- **Tested**: Yes — unit for outcome parsing (old and new shapes), replay carrying the id, and layout clearing; E2E for visible behaviour.

### 6. Main Navigation

- **Name**: Main nav (section resolver + renderer)
- **Responsibility**: Determines the current section and landing status from the request path and renders the responsive signed-in navigation.
- **Interface**: Resolver: path → `{ section: expenses | categories | tags | summary | recurring | profile | none, isLanding: boolean }`, pure. Renderer: resolver output plus user display name → header markup with desktop links and mobile disclosure. No failure modes.
- **Tested**: Yes — unit for the resolver (every section, landing vs sub-pages, look-alike prefixes, unknown paths → `none`); E2E for both viewports, fit, and keyboard operation.

## Testing Decisions

- **What makes a good test here:** assert externally observable behaviour — which rows are flagged and in what order, which page the user lands on, which values are preserved, what the alert shows, which nav elements are visible and fit at a given viewport — not internal helper calls or markup structure beyond stable test ids and ARIA attributes.
- **Unit tests (bun):**
  - Duplicate matcher: full boundary table, stable-id tiebreak, and prefilter-bound coverage (see Module 1).
  - Nav section resolver: mapping table including landing vs sub-pages and look-alike paths.
  - Duplicate lookup and entry pipeline against the test DB helper, including forced DB-error paths, cross-user fixtures, replay ordering, and the new-items-confirmed state (see Modules 2–3).
  - Idempotency outcome parsing with and without `lastEntryExpenseId`, and replay reproducing the id.
  - Duplicates handler action dispatch, including unknown/missing action.
- **E2E tests (Playwright):**
  - Duplicate flow: no-duplicate entry saves directly; duplicate entry shows page with pending expense on top and all matches ordered closest-date-first; recurring-generated row and another user's row are offered as matches; Save saves and shows success + alert; Cancel returns with all values (including tag chips and new-tag text) preserved; Discard returns to a cleared form with the "not saved" flash; duplicates + new category/tags shows duplicates first then new-items confirmation, then saves; new-items confirmation interrupted by a newly inserted duplicate → duplicates page → Save → saved with no second new-items page and exactly one new category/tag; cancel from new-items after approval forgets approval; re-prompt when a new matching expense is inserted between page render and Save; edit never shows the duplicates page; edit-with-new-items confirmation still works and shows the alert; stale selected tag on Save gives the recoverable error; no-JS flow works; forced DB error fails closed with values preserved; high-cardinality fixture (e.g., 150 matches) renders every match and Save round-trips the full approved set; above the hard limit (201 matches) returns to the form with values preserved and the too-many error, nothing saved.
  - Replay (actual POSTs with the same `submissionKey`, response discarded on the first): after a direct create, after duplicates Save, and after the combined duplicates → new-items flow — the retry yields the success flash, exactly one expense, and the alert for that expense; the same retry still succeeds after the matched data has changed and while `withForcedDbError` makes the duplicate lookup fail.
  - Concurrency (documents the best-effort guarantee): a matching expense committed before the final lookup of a Save triggers a re-prompt; a matching expense committed after that lookup (injected via a test hook between lookup and commit) results in both expenses saved with no warning.
  - CSRF: duplicates Save (and the initial create and new-items confirm) with a disallowed `Origin` header and with no session produce no write; same-origin forms with JavaScript disabled work.
  - Last-entry alert: appears after create, after create via each confirmation path, and after edit; positioned between form and filter bar; shows all fields and an Edit link that works; shown when the date is outside the list window; gone after Filter (including a description search), Clear filters, and reload; absent after validation error, cancel, discard, and delete; absent after a successful save whose redirect is not followed, followed by a visit to Summary and then Expenses; absent when a successful save's cookie is pending and a validation error / cancel / discard follows; reflects another user's edit made between commit and render (current-row semantics); absent when the expense was deleted before render; absent (page still renders) when the alert read is forced to fail; two tabs saving/loading in opposite orders behave per the documented last-writer-wins / first-reader-consumes rule; cleared by sign-out; resilient-submit replay still shows it.
  - Navigation: at a mobile viewport, links are hidden and the disclosure shows the current section label with arrow; opening it lists the six items and navigating works; Welcome text and Sign out are visible; section labels correct on sub-pages ("Expenses" on edit/duplicates pages, "Recurring" on recurring edit, "Profile" on profile); `aria-current="page"` on landing pages and `"true"` on sub-pages; works with JS disabled. Fit: at 320px with a 40-character display name on the "Categories" section, the document has no horizontal scroll (`scrollWidth ≤ clientWidth`), the trigger and Sign out are fully within the viewport and clickable, and the Welcome text is truncated but its full text is present; same check at 767px; at 768px the desktop row is shown and fits. Keyboard with JS disabled: Tab reaches the trigger with a visible focus ring, Enter opens it, `aria-expanded`/open state is exposed, Tab reaches each of the six links in order, Space/Enter on the trigger closes it, and closed links are skipped by Tab; with JS enabled, Escape closes and returns focus to the trigger, and an outside click closes. At a desktop viewport, the link row is visible, the disclosure is hidden, and the active link is highlighted with the correct `aria-current`.
- **Prior art:** handler-level unit tests such as the expense-confirm and recurring-confirm handler specs and the test-DB helper; expense-access and submission-idempotency specs for data-access and ledger tests; E2E specs for the new-items confirmation flow (entry new-tag confirmation, inline category creation), no-JS fallback, resilient-submit happy path/retry, and the existing `withForcedDbError` support for DB-failure injection.

## Out of Scope

- Duplicate detection on expense edits, deletes, recurring template create/edit, or recurring materialization (cron or dev trigger).
- Matching on description, category, tags, or author; fuzzy text similarity of any kind.
- User-configurable or environment-configurable tolerances; any settings UI.
- A standalone "find all duplicates in my history" report or bulk duplicate cleanup.
- Merging, deleting, or editing an existing expense from the duplicates page (rows have no Edit/Delete buttons there).
- Marking a pair of expenses as "not duplicates" so they are never flagged again.
- Atomic check-and-commit / serialization of distinct submissions (the duplicate warning is best-effort).
- Re-prompting when an approved row's values change but it still matches (approval is by row identity).
- HMAC signing of the duplicates page or the existing new-items confirmation page.
- Timed or manual (close button) dismissal of the last-entry alert; persisting it across reloads; per-tab alert delivery.
- Showing a snapshot of the submitted values in the alert (it shows the current row).
- Last-entry alert for category, tag, or recurring template saves, or for expense deletes.
- Changing or removing the existing green success flash.
- Mobile layout changes beyond the navigation bar (forms, tables, summary page); support below 320px.
- Hamburger/off-canvas drawer navigation; a full ARIA `menu` interaction model; user-agent-based device detection.
- Any schema change or migration.

## Open Questions

1. **Exact discard flash wording.** Proposed "Expense not saved." — Owner: Chris. Resolution: Acceptable - implement proposed wording.
2. **Duplicates page heading and explanatory copy.** Proposed heading "Possible duplicates" with one sentence explaining the match rule. — Owner: Chris. Resolution: Acceptable - implement proposed wording.
3. **Down-arrow glyph.** Inline SVG chevron vs. a text character. — Owner: implementer. Resolution: pick an inline SVG consistent with the existing layout icons; review in code review.
4. **Resilient-submit classification of the duplicates page.** Expected to need no change (it is a normal 200 server-rendered page like the existing confirmation page), but not yet verified. — Owner: implementer. Resolution: confirm with an E2E test during implementation; adjust classification only if the test fails.
5. **Too-many-matches error wording.** Proposed "Too many similar expenses to review. Expense not saved." — Owner: Chris. Resolution: Acceptable - implement proposed wording

## Critique Resolutions

Responses to `Notes/critiques/PRD-expense-log-2-critique.md`:

- **F1 (replay before duplicate check):** Pipeline step 0 recognises an already-committed `submissionKey` from the ledger and replays before any mutable check; the atomic commit-time guard is retained; one `submissionKey` spans all three entry points. Stories 44–45; replay E2E tests added.
- **F2 (new-items-confirmed state):** Added the confirmed new-items set and rule, its revalidation, carry-forward through a duplicates interruption, and the no-premature-writes guarantee. Stories 28–32; pipeline tests added.
- **F3 (race guarantee):** Decision — best-effort. Guarantee restated against the final pre-commit lookup; race explicitly accepted. Stories 37, 40; concurrency E2E documents both sides.
- **F4 (CSRF):** The app already applies Hono `csrf()` origin checking globally (`src/index.ts`) with `SameSite=Strict` cookies; the PRD now states all three create routes inherit it. Story 49; CSRF E2E added.
- **F5 (alert lifecycle):** Decision — per-browser. The layout clears the cookie on every render, non-saving POSTs and sign-out clear it, `Max-Age` 300s, multi-tab behaviour documented. Stories 57–58, 63–65.
- **F6 (fresh read):** Decision — current-row display, limitation documented, "Last saved" copy. Story 59.
- **F7 (mobile fit):** 320px minimum, Welcome text truncation with full name accessible, no horizontal scroll; fit-based E2E checks. Story 71.
- **F8 (dropdown a11y):** Decision — native `<details>` disclosure-navigation, full keyboard/AT contract, optional JS Escape/outside-click. Stories 77–80.
- **F9 (tiebreak):** Expense id added as final stable key.
- **F10 (volume):** ~100 supported, hard limit 200 with a recoverable no-save outcome; no silent truncation. Story 25.
- **Additional clarifications:** approval is by row identity (story 38); unknown/missing action → cancel (story 24); prefilter bounds tested in both directions; monetary domain is positive-only per `parseAmount`; error-path tests aligned; cross-user fixture added; `aria-current="page"` vs `"true"` (story 73); "Search" is the filter bar's description field, covered by Filter (story 57).

## Further Notes

- All data is shared across signed-in users (per the original PRD), so duplicate checks intentionally span every user's expenses.
- Recurring materialization already uses a separate code path from human entry, so "recurring entries just go through" is satisfied by not touching that path; a regression test should still confirm the cron inserts near-duplicate occurrences without interruption.
- All date arithmetic for the ±4-day window operates on stored `YYYY-MM-DD` strings; "today" (ET) is not involved in matching.
- Logging follows the existing discipline: route + error class + stack on infrastructure errors; never descriptions, amounts, or names.
- The input ideas document stated amounts should be "similar, but not identical"; during the interview this was clarified to *include* identical amounts.
- The input ideas document names "search, filter, or clear" as dismissing operations; the expense list's search is the description field of the filter bar, so Filter covers it.
