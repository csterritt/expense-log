# build-tags.tsx

**Source:** `src/routes/build-tags.tsx`

## Purpose

Placeholder route builder for the future tag-management page (`/tags`). Behind the signed-in middleware.

## Export

### `buildTags(app): void`

Route: `GET /tags`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='tags-page'` wrapper
- `<h1>Tags</h1>`
- Body text: `Tag management is coming soon.`

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.TAGS`, `STANDARD_SECURE_HEADERS`

---

See [source-code.md](../../source-code.md) for the full catalog.
