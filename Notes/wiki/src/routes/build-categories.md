# build-categories.tsx

**Source:** `src/routes/build-categories.tsx`

## Purpose

Placeholder route builder for the future category-management page (`/categories`). Renders a heading and "coming soon" message inside the standard layout, behind the signed-in middleware.

## Export

### `buildCategories(app): void`

Route: `GET /categories`

Middleware chain:

1. `secureHeaders(STANDARD_SECURE_HEADERS)`
2. `signedInAccess`

### Page content

- `data-testid='categories-page'` wrapper
- `<h1>Categories</h1>`
- Body text: `Category management is coming soon.`

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper used to render
- [middleware/signed-in-access.md](../middleware/signed-in-access.md) — auth gate
- [constants.md](../constants.md) — `PATHS.CATEGORIES`, `STANDARD_SECURE_HEADERS`

---

See [source-code.md](../../source-code.md) for the full catalog.
