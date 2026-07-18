# src/style.css

Tailwind CSS v4 + DaisyUI entry point. Defines the font theme and source file scanning.

## Contents

- `@import 'tailwindcss'` — Tailwind CSS v4 import
- `@source "./**/*.{html,js,ts,jsx,tsx}"` — scans all source files for class names
- `@plugin "daisyui"` — DaisyUI component plugin
- `@theme { ... }` — custom font family definitions for system UI, transitional, oldstyle, humanist, geometric humanist, classic humanist, neo-grotesque, monospace slab, monospace code, industrial, rounded sans, slab serif, antique, didone, and handwritten fonts

## Build

The CSS is compiled at build time to `public/style-{timestamp}.css` with a cache-busting filename. The compiled CSS is referenced in `src/renderer.tsx`.
