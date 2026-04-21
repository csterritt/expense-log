# 03-humorous-question-changes-daily.spec.ts

**Source:** `e2e-tests/profile/03-humorous-question-changes-daily.spec.ts`

## Purpose

Verifies the humorous security question on the profile page is deterministic and matches the expected list.

## Test cases

- `humorous question is displayed and deterministic` — question is present, non-empty, and identical across page reloads
- `humorous question is one of the expected questions` — verifies the question is from a hardcoded list of 13 humorous questions

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
