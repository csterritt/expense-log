# Critique 2: Expense Log Round 2 PRD

Date: 2026-10-16

## Findings

This is a requirements-only review of the revised PRD. Finding numbers below belong to this second critique. P1 means a core flow needs correction before issue generation; P2 means a material contract or acceptance gap; P3 means a lower-risk correctness or documentation gap. These are findings about the requirements, not verified implementation defects.

### F1. [P1] Replay recognition still misses a commit that occurs after step 0

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="138-147" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="74-75" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="269-270" />

Moving replay recognition before mutable checks fixes retries that start after the first attempt has committed. It does not establish the separate promise that two concurrent attempts with the same key both receive the stored outcome:

1. Attempts A and B carry the same valid `submissionKey`.
2. Both execute step 0 before either commits, so both observe no ledger outcome.
3. A passes its checks and commits the expense and ledger outcome.
4. B executes its duplicate lookup after A's commit. It finds A's expense, whose id was not in B's approved set.
5. B returns the duplicates page rather than the stored success. It never reaches `withAtomicIdempotency`, so the commit-time guard cannot correct its response.

This is a realistic retry overlap: the first request can still be running when a client times out and retries. The database still contains only one expense, but the user is incorrectly asked to approve an already-completed submission. The same gap applies to the confirmation entry points; mutable-check failures after the initial ledger miss can also prevent replay.

Required clarification: extend the replay-precedence contract to cover an outcome that becomes visible during an in-flight attempt, before that attempt resolves a mutable-check result into a warning or error. Specify the response-decision boundary and the behavior if the other attempt is still uncommitted at that boundary. Retain the atomic commit-time guard; it is necessary, but it does not protect branches that return before commit. Do not conflate this same-key race with the explicitly accepted race between distinct submissions.

Acceptance additions: use a controlled overlap where B's initial ledger read misses, A commits, and only then B performs its duplicate lookup. B must return the stored success and last-entry id, with exactly one expense and no duplicates page. Exercise direct entry and the confirmation paths. Also cover an outcome becoming visible after B's initial miss but before B resolves a duplicate-lookup failure. The current replay tests start after commit, and the documented concurrency test concerns distinct submissions; neither exercises this schedule.

Relationship to critique 1: F1 is partially resolved, not fully closed.

### F2. [P2] The cookie cannot guarantee first-reader consumption under concurrent requests

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="99-102" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="180-189" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="272-272" />

The per-browser decision is clear, and it is reasonable to accept one tab consuming another tab's alert. However, reading a request cookie and deleting it in a response is not an atomic consume operation:

- Two expenses GETs sent before either response clears the cookie both carry the same id. Both can render the alert, contrary to "whichever tab renders the expenses page first ... shows the alert."
- A page request can carry an old cookie and finish after a newer save's response has set a new id. The older response's unconditional cookie deletion can remove the newer pending alert.

Consequently, "last writer wins / first reader consumes" describes sequential request behavior, not a complete concurrency contract. This is distinct from the accepted loss caused by another section deliberately consuming a pending alert.

Required decision: either explicitly make alert delivery best-effort under overlapping requests, accepting duplicate displays, response-order overwrites, and stale-response clearing, or require coordinated consumption that can actually enforce stronger semantics. Keeping the simple cookie mechanism is a reasonable choice for this cosmetic feature; if chosen, narrow the one-shot and most-recent-save promises rather than implying exactly-once delivery or commit-order delivery. Per-tab delivery need not be introduced.

Acceptance additions: send two expenses GETs with the same pending cookie before either completes; separately, delay an old page response until after a new save has set its cookie. Assert the chosen outcomes. The existing "opposite orders" test requirement should explicitly distinguish overlapping requests from sequential tab operations.

Relationship to critique 1: F5's lifecycle and scope decisions are largely resolved, but its concurrency semantics remain stronger than the specified mechanism.

### F3. [P2] A pending alert can appear on Filter or Clear despite the unconditional dismissal rule

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="94-101" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="182-190" /> <ref_snippet file="/home/chris/expense-log/Notes/Ideas-2.md" lines="23-23" />

The PRD says Filter, description search, and Clear filters render without the alert because they are plain GETs. But the post-save redirect also leads to a plain expenses GET, and the specified handler renders an alert whenever it finds `LAST_ENTRY`, before the layout clears it.

For example, a save response sets the cookie but its redirect is not followed. In an already-open expenses tab, the user then submits Filter or description search as the next request. That expenses GET still carries the cookie and therefore renders the alert under the stated handler rule. Clear filters can do the same. No intervening Summary render is necessary.

This exposes a conflict between "the first expenses render consumes and displays it" and "Filter/Clear always remove it," even with entirely sequential requests. Clearing the cookie in the layout prevents a later display; it does not suppress the alert already being rendered in this response.

Required decision: say whether Filter/search/Clear must suppress an unconsumed alert, or whether their dismissal promise applies only after the alert has already been displayed. If suppression is required, define how those requests are distinguished from the successful save's redirect, including a Clear request that otherwise has the same URL. If the next-expenses-render behavior is intentional, explicitly narrow the dismissal wording and record that qualification against the input requirement. HTTP method alone does not establish the distinction.

Acceptance additions: obtain a successful save response and its cookie without following the redirect, then make Filter, description search, and Clear filters the first subsequent expenses request. Assert the chosen behavior and verify that a later ordinary expenses request cannot resurrect the consumed alert.

Relationship to critique 1: this is a remaining edge of F5's lifecycle contract, not a request to undo the per-browser decision.

## Status Of The First Critique

The revision makes substantial, useful progress. Most previous findings should not be carried forward as unresolved:

- Original F1: partially resolved. Early replay recognition fixes already-committed retries; overlapping attempts still need the response-precedence rule in this critique's F1.
- Original F2: resolved at the requirements level. The confirmed-new-items set, recomputation, carry-forward through a duplicate interruption, and no-premature-writes rule define a terminating flow.
- Original F3 and F4: resolved at the requirements level. The distinct-submission race is explicitly accepted, and all three create routes inherit the stated request-origin protection with acceptance tests.
- Original F5: partially resolved. Browser scope, expiration, intervening renders, failed-operation invalidation, and sign-out cleanup are specified; the remaining concurrency and Filter/Clear qualifications are F2 and F3 here.
- Original F6 through F10: resolved at the requirements level. Current-row display is an explicit choice; mobile fit and native disclosure interaction have concrete acceptance criteria; ids break sort ties; excessive match counts have a recoverable no-save outcome.
- Additional clarifications: row-identity approval, fail-safe action dispatch, conservative prefilter coverage, positive-only amounts, error-path coverage, cross-user matching, current-section semantics, and the meaning of Search are now addressed.

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="125-176" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="178-212" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="267-273" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="303-317" />

These dispositions accept the PRD's recorded product decisions. They do not independently verify its claims about existing helpers, middleware, or storage behavior.

## Minor Documentation Cleanup

- The "Critique Resolutions" introduction still names `Notes/critiques/PRD-expense-log-2-critique.md`, while the supplied first critique is now `Notes/critiques/PRD-expense-log-2-critique-1.md`. Update the reference so readers can locate the review being resolved. This is not a readiness blocker.

Source: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="303-305" />

## Input Alignment

All three feature areas remain represented: human-entry duplicate warnings with a dedicated decision page, a prominent last-entry alert, and responsive navigation retaining desktop links. Including exact amount matches is recorded as an interview clarification, so it is not treated as an accidental deviation from the ideas document.

The current-row alert and best-effort distinct-submission warning are now explicit choices and are not reopened by this review. The bounded match-count failure is visible and saves nothing rather than silently omitting candidates. The native disclosure and no-JavaScript contract are materially clearer than before.

Sources: <ref_file file="/home/chris/expense-log/Notes/Ideas-2.md" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="15-17" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="321-326" />

## Readiness

Not ready for issue generation until F1's overlapping-replay behavior is corrected. Resolve F2 and F3 with explicit alert semantics before generating the affected issues, so implementation and acceptance tests do not encode incompatible guarantees. These are focused corrections; no broader redesign or expansion of feature scope is warranted.

## Review Scope

- Followed the repository's `critique-prd` skill.
- Reviewed only `Notes/PRD-expense-log-2.md` as the session's PRD, using `Notes/Ideas-2.md` as input and `Notes/critiques/PRD-expense-log-2-critique-1.md` to assess the previous findings.
- Read applicable agent instructions and the critique skill for process guidance.
- Did not inspect source code, other PRDs, git history, or existing tests; implementation claims remain unverified.
- Added only this critique. Did not modify the PRD or generate issues/tasks. No application tests were run for this documentation-only review.
