// ====================================
// Tests for src/lib/db/expense-access.ts
//
// Note on `listTags` (and the other DB helpers in this file):
// Issue 05 task 3 and Issue 06 deferred unit-level DB assertions to the
// Playwright e2e suite because no in-memory D1 / SQLite test harness was
// established in `tests/`. Issue 07 task 2 mirrors that decision: the
// behavior of `listTags` is verified end-to-end via the entry-form's
// embedded `tags-data` payload and the tag-chip-picker e2e spec
// (`e2e-tests/expenses/07-tag-chip-picker-js.spec.ts`).
//
// To run: cd to the project root and run `bun test`.
// ====================================

import { describe, it } from 'bun:test'

describe('expense-access DB helpers', () => {
  it('DB-level assertions are covered by Playwright e2e specs', () => {
    // intentionally empty — see header comment above
  })
})
