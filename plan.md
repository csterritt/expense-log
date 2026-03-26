# Fix: Sign-up handlers and pages are duplicated

## Problem

The gated sign-up handler logic is nearly identical between:

- `handle-gated-sign-up.ts` (lines 37-133)
- `handle-gated-interest-sign-up.ts` (lines 52-148)

Similarly, the gated sign-up form JSX is duplicated between:

- `build-gated-sign-up.tsx` (lines 29-139)
- `build-gated-interest-sign-up.tsx` (lines 29-189)

This raises divergence risk—bug fixes or changes must be applied in multiple places.

## Assumptions

- The handler logic for gated sign-up (code validation → account creation) is identical and can be extracted.
- The form components can be extracted into reusable JSX components.
- The combined page (`build-gated-interest-sign-up.tsx`) composes both forms, so shared components work well.

## Plan

1. **Extract shared handler logic** — Create `processGatedSignUp(c, data)` in `sign-up-utils.ts` that handles code claiming, auth API call, error handling, and redirect. Both handlers call this.
2. **Extract shared form component** — Create `GatedSignUpForm` component in a new `components/` file that both pages import.
3. **Update handlers** — Refactor `handle-gated-sign-up.ts` and `handle-gated-interest-sign-up.ts` to use the shared helper.
4. **Update pages** — Refactor `build-gated-sign-up.tsx` and `build-gated-interest-sign-up.tsx` to use the shared form component.
5. **Verify** — Run `tsc --noEmit` and existing tests to confirm no regressions.

## Pitfalls

- **Over-abstraction** — Don't abstract too early; keep the shared code focused on truly identical logic.
- **Props explosion** — If the shared component needs many props, consider whether the abstraction is worth it.
- **Test coverage** — Ensure E2E tests still pass after refactoring; the behavior should be identical.
