# public/js/tag-chip-checkboxes.js

Progressive-enhancement for the tag chip-checkbox component. Self-contained vanilla JS IIFE — no frameworks, no build step, no imports.

## Responsibilities

1. **Reflect `:checked` state** via class toggling on parent `<label>` elements (for browsers that need it)
2. **Optimistic preview chips** — renders typed `newTags` tokens as visual chip previews next to the existing chip block

## Security Contract

- `setAttribute` restricted to safe allow-list: `class`, `aria-label`, `data-*`
- User-controlled values reach DOM only via `textContent` and `aria-label`
- Optimistic chips are `<span>` elements (never `input`/`button`/`select`)
- Init failures swallowed and logged via `console.error`
- Native checkbox toggling and form submission work even when script throws

## Internal Structure

- `CHIP_CLASS_BASE` / `CHIP_CLASS_SELECTED` — kept in sync with `src/components/tag-chip-checkboxes.tsx`
- `safeSetAttribute(el, name, value)` — attribute allow-list enforcement
- `reflectCheckedState(container)` — toggles chip classes based on checkbox state
- `parseNewTagTokens(raw)` — splits on commas/whitespace, trims, lowercases, deduplicates
- `renderOptimisticChips(previewContainer, tokens)` — renders `<span>` chips via textContent
- `initContainer(container)` — wires up checkbox change listeners and newTags input listener
- `init()` — finds all tag chip containers and newTags inputs, initializes each

## Activation

Auto-runs on DOMContentLoaded. Finds elements via `[data-testid="tag-chip-checkboxes"]` and `input[name="newTags"]`.
