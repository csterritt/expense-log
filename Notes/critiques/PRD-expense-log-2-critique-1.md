# Critique: Expense Log Round 2 PRD

Date: 2026-10-16

## Findings

This is a requirements-only review. P1 means a core flow needs correction before issue generation; P2 means a material contract or acceptance gap; P3 means a lower-risk correctness or hardening gap. These are findings about the document, not verified defects in the implementation.

### F1. [P1] Replay handling must precede the new duplicate check

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="67-76" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="123-129" />

The pipeline checks duplicates at step 3 but reaches the idempotency ledger only at step 5. That ordering conflicts with the promised successful replay:

1. A valid expense with no duplicates is committed.
2. Its response is lost, so the client retries the same submission.
3. The duplicate lookup now finds the expense created by the first attempt.
4. That new expense id is not in the approved set, so the pipeline returns a duplicates page rather than the stored success.

The same problem occurs after duplicates-page Save: the newly committed row was not among the previously approved ids. A lookup outage or a deleted tag can also turn a previously successful submission into a failure if mutable checks run before replay recognition. Avoiding a second insert is not sufficient; the PRD promises the same success result and last-entry alert.

Required clarification: explicitly resolve an already-committed submission from the ledger before rerunning mutable validation and duplicate/new-item queries. Retain the existing request identity and authorization checks, and the atomic commit-time idempotency guard for concurrent attempts. State that the same submission has a consistent identity across the three create entry points.

Acceptance additions: lose the response after a direct create, duplicates Save, and the combined duplicate/new-items flow; retry the actual POST and assert success, one expense, and the correct alert. Also cover a replay after the matched data changes or the duplicate lookup becomes unavailable. Testing only the ledger parser does not exercise this ordering.

### F2. [P1] The shared pipeline lacks an explicit new-items-confirmed state

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="52-56" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="123-131" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="188-193" />

All three create entry points use the same decision function. Its step 4 says that if anything is new, it renders the new-items confirmation page. Its documented input includes duplicate approval but does not define how confirmation of new categories/tags changes that decision.

A literal implementation can redisplay the same confirmation indefinitely: the user confirms a new category, the pipeline runs again, the category is still absent because nothing has committed, and step 4 asks for confirmation again.

Required clarification: define the confirmation stage or equivalent explicit input that authorizes creating the new items shown to the user. Specify which submitted names it covers, how they are revalidated, and what happens to that approval if a newly discovered duplicate interrupts the final confirmation. Do not create category/tag records merely to make the pipeline advance.

Acceptance additions: test the pipeline result after new-items confirmation, not just its initial `confirm-new-items` result. Cover a new-items confirmation interrupted by a newly appearing duplicate, followed by Save, and assert eventual commit without an unintended loop or premature writes.

### F3. [P2] The race guarantee is stronger than the specified check/commit protocol

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="67-69" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="123-129" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="244-244" />

Rechecking when Save arrives catches changes since the page was rendered, but it does not cover changes between that lookup and the commit. Two users with different submission keys can both find no match and then both insert. A recurring insertion can similarly occur after a human-entry check. Submission idempotency does not serialize distinct submissions.

The story's "never unknowingly approve a duplicate I wasn't shown" wording therefore overstates what the described protocol guarantees.

Required decision: either define the warning as best-effort against the rows observed by the final pre-commit lookup, explicitly accepting this race, or require an atomic check-and-commit guarantee and establish its feasibility within the no-schema-change constraint. Do not leave this choice implicit for the implementer.

Acceptance addition: a controlled concurrent-submission test that distinguishes changes before the final lookup from changes after it, with the chosen expected outcome documented.

### F4. [P2] The new mutation route has no explicit request-forgery protection contract

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="131-142" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="238-238" />

The route is required to use signed-in middleware and response security headers, but neither requirement specifies protection against cross-site requests authenticated by browser cookies. The accepted decision not to sign duplicate approvals is a different concern; it does not establish a CSRF policy.

This review does not establish that the application lacks CSRF protection. It establishes that the new route's requirements do not say what protection it must inherit.

Required clarification: reference the existing mutation-request protection contract if one exists, or specify the applicable origin/token and cookie policy. Apply it consistently to the initial create and both confirmation routes. Keeping duplicate approvals unsigned must not waive request-origin protection.

Acceptance additions: unauthenticated and disallowed cross-origin Save requests cause no writes; legitimate same-origin forms work with JavaScript disabled.

### F5. [P2] A globally shared cookie is not a complete one-shot alert lifecycle

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="87-91" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="152-155" />

The PRD promises dismissal on any next navigation and no alert after failed or abandoned operations. The specified mechanism only consumes the cookie on an expenses GET.

If a successful POST sets the cookie but its redirect is not followed, visiting Summary does not consume it under the stated design. A later expenses visit can show a stale alert. An intervening failed save or cancellation is also not specified to clear a pending cookie. In addition, browser cookies are shared across tabs: another tab can consume or overwrite the alert intended for the save's redirect.

Required clarification: define whether the guarantee is per browser or per save/redirect, which requests invalidate an unconsumed alert, and the behavior of concurrent tabs/saves. Either make the mechanism satisfy those semantics or explicitly narrow the promise. Specify cookie scope, expiration, and cleanup at sign-out as part of that lifecycle.

Acceptance additions: an interrupted redirect followed by another section and a return; a pending cookie followed by validation error/cancel/discard; and two tabs saving or loading expenses in opposite orders.

### F6. [P2] A fresh database read can misrepresent what the user just saved

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="80-90" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="152-156" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="255-255" />

The feature is meant to let a user verify the values they just entered, but the cookie and ledger retain only an id and the GET reads the current row. Another household member can edit that expense between commit and GET, or before a delayed replay. The "Last saved" alert will then show that other edit rather than the values submitted by this user.

Deletion before rendering has an explicit policy; modification before rendering does not.

Required decision: choose a saved-values confirmation or a current-row display. If exact confirmation is required, retain the committed values or an appropriate versioned representation. If a current-row display is intentional, state the limitation and use copy that does not imply the displayed values necessarily came from this save.

Acceptance addition: edit the row between commit and alert rendering, and again before replay, then assert the chosen semantics.

### F7. [P2] The mobile header can satisfy the component rules and still overflow

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="9-9" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="96-100" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="165-166" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="227-227" />

Replacing the links does not establish that the header fits. The longest section label, arrow, full "Welcome, name!" text, and Sign out are still required outside the dropdown. A long display name on a narrow phone can reproduce the original overflow even if every visibility assertion in the test plan passes.

Required clarification: define the minimum supported width and an allowed strategy for the welcome text, such as wrapping or visual truncation with the full name still accessible. Require that navigation and Sign out remain visible and operable without header-induced horizontal scrolling.

Acceptance additions: the smallest supported phone width, a long display name, the longest section label, browser zoom/reflow, and the 767px/768px boundary. Check actual fit, not just which layout is visible.

### F8. [P2] The dropdown needs a complete accessible interaction contract

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="105-106" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="165-170" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="227-227" />

The accessibility story requires focusable controls and reachable links, but the implementation decision selects a focus-based dropdown without defining its closed/open behavior for keyboard and assistive-technology users. The E2E plan only explicitly tests opening and navigation, not the keyboard story.

Required clarification: define the trigger's semantics and state announcement, keyboard activation, focus order into and out of the links, a reliable dismissal mechanism, and whether closed links are excluded from keyboard navigation. The chosen no-JavaScript primitive must support that contract; do not assume a DaisyUI class establishes it.

Acceptance additions: keyboard-only navigation with JavaScript disabled, visible focus, opening and dismissal, reaching every destination, and checking the trigger's accessible name/state. Use disclosure-navigation semantics unless a full ARIA menu interaction model is actually intended.

### F9. [P3] The specified "final deterministic tiebreak" is not deterministic for identical rows

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="118-118" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="178-179" />

Rows can share date, amount, and description, including descriptions that compare equal case-insensitively. These are especially plausible in a duplicate-detection feature. The stated comparator leaves them tied, so input/database order can still change the displayed order.

Required clarification: add a stable unique final key, such as expense id, after the human-facing sort keys.

Acceptance addition: multiple matching rows identical on every preceding sort key produce the same id order even when the candidate input order is reversed.

### F10. [P3] A nine-day window does not bound the number of matches

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="119-119" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="137-137" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="146-146" />

The PRD justifies an uncapped result set by saying the date window keeps it small. A date window bounds dates, not row count. Every match is rendered and its id is carried in hidden fields, so result volume also affects response size and the subsequent POST body.

Required clarification: state a supported data-volume assumption and how the page remains usable within it. Preserve the input requirement to make all matches available; do not silently truncate results. If a platform/request limit is exceeded, define a recoverable no-save outcome with pending values preserved rather than an unexplained failure.

Acceptance addition: a high-cardinality fixture validates complete results, approval round-tripping, and the chosen recoverable behavior at supported limits.

## Additional Clarifications And Test Gaps

These are smaller additions, not separate claims of implementation defects.

- Approval identity: ids alone approve an expense even if its amount/date/description changes while the page is open. State whether approval means "this row identity" or "the values I reviewed"; re-prompt on material changes if the latter is intended.
- Invalid actions: define fail-safe handling of a missing or unknown duplicates-page `action`; it must never default to Save or consume the submission key.
- SQL prefilter coverage: test the lookup's conservative bounds, not only the pure matcher. For example, $10,000.00 and $10,101.01 match under the specified rounded rule, but a prefilter using only 1% of the pending $10,000.00 would omit the higher row. Test both submission directions and rounding boundaries.
- Monetary domain: explicitly reference the inherited valid amount range and sign rules. If credits/negative amounts are valid, clarify whether the percentage uses signed amounts or magnitudes; the written formula uses signed amounts.
- Error coverage: the plan includes duplicate lookup failure, but should also explicitly cover alert-read failure, a deleted saved expense, a stale selected tag, and edit-with-new-items confirmation. Several are already stories; this is a test-plan alignment gap, not a request to invent new behavior.
- Matching scope: include a cross-user fixture, not just manual and recurring provenance, so the intentionally shared-data rule is tested.
- Navigation semantics: distinguish a current section from the exact current page. On an expense edit page, the Expenses landing link is not that page; clarify the appropriate `aria-current` value rather than requiring `"page"` for every owning-section link.
- Alert dismissal: the input explicitly names Search as well as Filter/Clear. Include Search in acceptance coverage if it is a distinct supported operation; otherwise record which existing operation satisfies it.

Sources: <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="114-129" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="137-141" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="152-167" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="219-227" /> <ref_snippet file="/home/chris/expense-log/Notes/Ideas-2.md" lines="23-23" />

## Input Alignment And Strengths

All three input feature areas are represented. The duplicate warning preserves the entry-only scope, excludes edits/deletes/recurring generation, and lists all matches on a separate decision page. The last-entry alert uses the requested placement and DaisyUI classes without a timer. Mobile navigation retains desktop links and adds the requested current-section label and arrow.

The apparent change from "similar, but not identical" to including identical amounts is explicitly documented as an interview clarification in the PRD. This review treats that recorded decision as authoritative; it does not flag it as an accidental deviation or attempt to reconstruct the interview.

The PRD is strong on concrete amount/date boundaries, exact validation/error messages, preserving user input, ordering duplicate approval before new-item creation, fail-closed duplicate lookup behavior, HTML escaping, privacy-conscious logging, and no-JavaScript operation. These are useful foundations to retain.

Sources: <ref_file file="/home/chris/expense-log/Notes/Ideas-2.md" /> <ref_snippet file="/home/chris/expense-log/Notes/PRD-expense-log-2.md" lines="255-259" />

## Readiness

Not ready for issue generation without correcting F1 and defining the confirmation state in F2. Resolve the concurrency guarantee in F3 and the alert semantics in F5/F6 before splitting the work, so implementation issues do not encode contradictory promises. The remaining findings can be addressed with focused requirements and acceptance-criteria edits; they do not justify expanding into a redesign.

## Review Scope

- Followed the repository's `critique-prd` skill as a requirements review.
- Examined only the supplied PRD and Ideas document as product evidence.
- Read the applicable agent instructions and critique skill for process guidance.
- Did not examine git history, source code, other PRDs, or existing tests.
- Did not independently verify PRD claims about existing helpers, middleware, routes, or interview decisions.
- Did not modify the PRD or generate implementation issues/tasks. No application tests were run.
