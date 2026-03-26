# Failed Tests

## e2e-tests/general/04-new-event.spec.ts:414 — `shows "No events yet" when signed in with no events`

**Problem:** The test signs in and then waits for `[data-testid="no-events-message"]` on the home page, but the wait times out (1.5 minutes). The most likely cause is that the sign-in redirect no longer lands cleanly on `/ui/` before the selector lookup, or the `no-events-message` element is not being rendered because the Vue frontend is not loaded in time. This was not caused by the recent changes (no events message and timeline display are unaffected by the changes made here).

---

## e2e-tests/general/10-timeline-filter.spec.ts:30 — `filter controls appear when signed in with events`

**Problem:** The `signInAndGoHome` helper waits for `[data-testid="filter-controls"]` after signing in. This times out at 1.5 minutes. The filter controls div is always rendered in `TimelineDisplay.vue` (no `v-if` guard), so the timeout happens during or after the sign-in step. This may be a sign-in rate-limiting or session issue when many sign-in tests run sequentially.

---

## e2e-tests/general/10-timeline-filter.spec.ts:48 — `min date picker starts with the earliest event date`

**Problem:** Same root cause as above — `signInAndGoHome` times out before the test body can run. The test asserts the min year/month/day filter inputs are pre-populated with the earliest seeded event date (1732-01-01), but never gets past the sign-in wait.

---

## e2e-tests/general/10-timeline-filter.spec.ts:59 — `max date picker starts with the latest event date`

**Problem:** Same root cause — `signInAndGoHome` times out. The test asserts that max filter inputs are pre-populated with the latest seeded event date (1969-07-20), but never gets past the sign-in wait.

---

## e2e-tests/general/10-timeline-filter.spec.ts:109 — `changing min date filters the event list`

**Problem:** Same root cause — `signInAndGoHome` times out. The test changes the min year filter to 1900 and expects the event list to shrink, but never gets past the sign-in wait.

---

## e2e-tests/time-info/04-update-event.spec.ts:43 — `PUT /time-info/event/:id › updates event when authenticated`

**Problem:** The PUT request to `/time-info/event/test-event-1` returns HTTP 404 instead of 200. The test signs in, extracts cookies, and sends the PUT request directly via `request.put`. The 404 means `getEventById(db, 'test-event-1')` returns null even though `seedEvents()` was called in `beforeEach`. The event either isn't being inserted, isn't findable by that ID, or the CSRF/cookie handling for the `request` fixture bypasses something that causes the route to behave differently.

---

## e2e-tests/time-info/04-update-event.spec.ts:66 — `PUT /time-info/event/:id › preserves createdAt on update`

**Problem:** Same root cause as above — `updateResponse.json()` returns `undefined` for `updatedAt` because the PUT returns a 404 (no body with `updatedAt`), causing `expect(updatedEventResult.updatedAt).not.toBe(originalEvent.updatedAt)` to fail with "Expected: not undefined".
