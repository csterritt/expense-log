# Critique of Issue 18 Task Plan

Overall, the updated task is strong: it explicitly treats the UI as untrusted, adds caps before DB lookup, covers legacy unsafe stored names, requires malformed-query fallback, and fixes the Summary sort bug with internal chronological keys. The biggest issues are around **tamper-detection semantics**, a few **task sequencing contradictions**, and some contracts that should be made explicit for categories as well as tags.

## Logic Correctness and Edge Cases

- **Critical: hidden-field tamper rejection is underspecified/impossible as written**
  - The PRD/task says confirmation handlers must “fully re-run validation” and reject tampered hidden fields, including modified amount or swapped category id.
  - Revalidation only proves the submitted values are valid; it cannot prove they are the same values shown on the confirmation page.
  - Example: changing hidden amount from `10.00` to valid `20.00` will pass normal validation unless there is server-side pending state or a signed payload.
  - **Recommendation:**:
    - **Tamper-detecting confirmation:** add an HMAC/signature over canonical hidden payload, or persist pending confirmation state server-side, then reject payload changes before normal validation.

- **Task sequencing has Red/Green conflicts**
  - Task 14 defines four specs, including confirmation, tamper, no-JS, and broken-JS behavior, then task 15 says to make “task-14 spec” green before confirmation hardening tasks 22–24.
  - This can force premature implementation or make the plan impossible to follow strictly.
  - **Recommendation:** split task 14 into separate RED tasks:
    - 14a entry chip submit only → task 15 green.
    - 14b confirmation/new-tag behavior → after confirmation handler work.
    - 14c tamper/error preservation → after hardening.
    - 14d no-JS/broken-JS → after JS wiring.

- **Validator purity vs repository-spy requirement conflicts**
  - Task 2 says `parseTagInputs(raw, existingTags)` should be HTTP-agnostic and perform no DB lookup.
  - Task 1/2 also asks for a spy/mock repository proving invalid IDs never reach `listTagsByIds`.
  - **Recommendation:** split into:
    - Pure parser unit tests: invalid IDs are excluded from `lookupCandidateTagIds`.
    - Handler/repository tests: only parser-approved IDs are passed to DB lookup.

- **“Per user-scope” uniqueness conflicts with shared-data model**
  - Task 22 asks for unique indexes “per user-scope,” but the PRD states no per-user ownership and all signed-in users share all categories/tags.
  - **Recommendation:** change this to global uniqueness on `category.name` and `tag.name`, as the data model is not being changed.

- **Category input contract is less explicit than tag contract**
  - The task thoroughly defines `tagId` syntax, caps, stale behavior, collision normalization, and confirmation races.
  - Category selection/creation can be tampered too, but category ID/name validation is not specified with the same precision.
  - **Recommendation:** add a parallel category contract:
    - category ID syntactic validation before lookup,
    - existence behavior,
    - new-category name normalization,
    - race reuse,
    - confirmation revalidation/signature behavior.

- **Summary tie-breakers are clearer in tasks than PRD**
  - Tasks define Category+Tag clicked-column tie-breakers precisely.
  - PRD says ties retain default group/time ordering, but is less explicit for clicked `category` vs clicked `tag`.
  - **Recommendation:** update PRD/issue with the same Category+Tag tie-breaker rules from task 7/8.

## Security Vulnerabilities and Data Validation

- **ULID uppercase-only rule should be made explicit everywhere**
  - Task 1 requires exact uppercase Crockford regex and rejects lowercase.
  - PRD only says ULID format.
  - **Recommendation:** update PRD/issue to state uppercase-only if that is intentional, and verify all existing/generated IDs are uppercase. If existing data can contain lowercase IDs, filters may silently drop legitimate selections.

- **Request-size limits should be explicit beyond field caps**
  - `newTags` and `tagId` caps help, but huge form/query submissions can still stress parsing before validation.
  - **Recommendation:** reference existing request body size limits or add max body/query handling for affected routes.

- **Client JS safe-attribute rule is mostly good, but too broad**
  - Allowing `setAttribute('value', userControlled)` is safe only if never placed on a successful form control.
  - Optimistic chips should be visual only.
  - **Recommendation:** specify optimistic chips are non-form elements and user-controlled text goes only to `textContent` and, if needed, safe `aria-label`.

- **Shared class constants between TSX and static JS may be impractical**
  - Task 13 says to extract shared chip-class constants between component and vanilla JS, but there is no build step.
  - **Recommendation:** duplicate named constants in both files with tests

## Error Handling and Logging

- **Clarify unexpected confirmation failure UX**
  - The PRD/task sometimes says unexpected DB errors during confirmation return a recoverable state with values preserved.
  - Read failures use the standard error response.
  - **Recommendation:** explicitly distinguish:
    - validation/conflict errors → recoverable form/confirmation re-render,
    - unexpected infrastructure errors → recoverable state, consistently defined.

- **Logging tests need a concrete hook**
  - Tasks mention force-injected DB errors and sanitized logging assertions.
  - **Recommendation:** define or reference the existing log capture/injection helper so implementers don’t add ad hoc logging paths that differ from production.

# Recommended Edits Before Implementation

- **Add signed confirmation strategy or relax tamper-rejection claims.**
- **Split task 14 and similar e2e tasks so Red/Green sequencing is executable.**
- **Replace “per user-scope” uniqueness with global uniqueness.**
- **Make category validation/race semantics as explicit as tag semantics.**
- **Promote invalid-calendar-date handling into PRD/issue acceptance criteria.**
- **Clarify uppercase ULID policy across PRD, issue, and tasks.**
- **Reference CSRF/body-size protections explicitly.**
- **Revise the JS shared-constant requirement to fit a no-build static JS setup.**
