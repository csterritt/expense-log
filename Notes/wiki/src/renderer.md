# renderer.tsx

**Source:** `src/renderer.tsx`

## Purpose

Hono JSX renderer middleware. Wraps all rendered responses in a standard HTML document shell with Tailwind CSS and DaisyUI.

## Export

### `renderer`

Created via `jsxRenderer()` from `hono/jsx-renderer`.

Renders:

- `<html lang='en' data-theme='light'>`
- `<head>` with charset, viewport, and linked stylesheet (`/style-20250722184943.css`)
- `<title>Expense Log</title>`
- `<body className='min-h-screen bg-base-200'>` with `{children}`

Configured with `{ docType: true }` to emit `<!DOCTYPE html>`.

## Cross-references

- [style.css.md](style.css.md) — the linked stylesheet

---

See [source-code.md](../source-code.md) for the full catalog.
