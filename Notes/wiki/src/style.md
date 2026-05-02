# style.css

**Source:** `src/style.css`

## Purpose

Tailwind CSS v4 entrypoint. Uses `@import 'tailwindcss'` (no legacy directives), `@source "./**/*.{html,js,ts,jsx,tsx}"` for content scanning, and `@plugin "daisyui"` for DaisyUI components. Contains a large `@theme` block defining 15 named font family custom properties: `--font-systemui`, `--font-transitional`, `--font-oldstyle`, `--font-humanist`, `--font-geohumanist`, `--font-classhuman`, `--font-neogrote`, `--font-monoslab`, `--font-monocode`, `--font-industrial`, `--font-roundsans`, `--font-slabserif`, `--font-antique`, `--font-didone`, `--font-handwritten`. Processed by the build pipeline into a fingerprinted asset (`style-{timestamp}.css`) linked by the renderer.

## Cross-references

- [renderer.md](renderer.md) — links the generated stylesheet

---

See [source-code.md](../source-code.md) for the full catalog.
