/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Progressive-enhancement for the tag chip-checkbox component.
 * Self-contained vanilla JS — no frameworks, no build step, no imports.
 *
 * Responsibilities:
 *   (a) Reflect :checked state via a class hook for browsers that need it.
 *   (b) Optimistically render typed newTags tokens as already-selected chip
 *       previews next to the existing chip block, using textContent and
 *       setAttribute only — never innerHTML.
 *
 * Security contract:
 *   - setAttribute is restricted to the safe allow-list: class, aria-label, data-*.
 *   - User-controlled values reach the DOM only via textContent (and aria-label).
 *   - Optimistic chips are <span> elements (never input/button/select).
 *   - Init failures are swallowed and logged via console.error.
 *   - Native checkbox toggling and form submission work even when this script throws.
 */
;(() => {
  'use strict'

  // Must stay in sync with src/components/tag-chip-checkboxes.tsx.
 const CHIP_CLASS_BASE = 'badge cursor-pointer'
 const CHIP_CLASS_SELECTED = 'badge badge-soft badge-primary cursor-pointer'

  /**
   * Safe setAttribute: only allows class, aria-label, and data-* attributes.
   * User-controlled values must never be used as attribute names.
   */
  const safeSetAttribute = (el, name, value) => {
    if (name === 'class' || name === 'aria-label' || name.startsWith('data-')) {
      el.setAttribute(name, value)
    }
  }

  /**
   * Reflects the :checked state of each tagId checkbox by toggling the
   * selected class on its parent label.
   */
  const reflectCheckedState = (container) => {
    const checkboxes = container.querySelectorAll('input[type="checkbox"][name="tagId"]')
    for (const cb of checkboxes) {
      const label = cb.closest('label')
      if (!label) {
        continue
      }
      if (cb.checked) {
        label.className = label.className
          .split(' ')
          .filter((c) => c !== 'badge-outline')
          .join(' ')
        if (!label.className.includes('badge-primary')) {
          label.className = CHIP_CLASS_SELECTED
        }
      } else {
        label.className = label.className
          .split(' ')
          .filter((c) => c !== 'badge-primary')
          .join(' ')
        if (!label.className.includes('badge-outline')) {
          label.className = CHIP_CLASS_BASE
        }
      }
    }
  }

  /**
   * Parses the newTags text value into individual tokens, mirroring the
   * server-side split logic: split on runs of commas and/or ASCII whitespace,
   * trim, lowercase, drop empties.
   */
  const parseNewTagTokens = (raw) => {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return []
    }
    const seen = new Set()
    const result = []
    for (const token of raw.split(/[,\s]+/)) {
      const lowered = token.trim().toLowerCase()
      if (lowered.length === 0 || seen.has(lowered)) {
        continue
      }
      seen.add(lowered)
      result.push(lowered)
    }
    return result
  }

  /**
   * Renders optimistic preview chips for typed newTags tokens.
   * Chips are <span> elements (non-form-control), never <input>/<button>/<select>.
   * User-controlled text reaches the DOM only via textContent and aria-label.
   */
  const renderOptimisticChips = (previewContainer, tokens) => {
    previewContainer.textContent = ''
    for (const token of tokens) {
      const chip = document.createElement('span')
      safeSetAttribute(chip, 'class', `${CHIP_CLASS_SELECTED} opacity-70`)
      safeSetAttribute(chip, 'aria-label', token)
      safeSetAttribute(chip, 'data-testid', 'new-tag-preview-chip')
      chip.textContent = token
      previewContainer.appendChild(chip)
    }
  }

  /**
   * Initialises chip-checkbox enhancement for a single chip block container.
   */
  const initContainer = (container) => {
    const chipBlock = container.querySelector('[data-testid="tag-chip-checkboxes"]')
    const newTagsInput = container.querySelector('input[name="newTags"]')

    if (chipBlock) {
      reflectCheckedState(container)
      const checkboxes = chipBlock.querySelectorAll('input[type="checkbox"][name="tagId"]')
      for (const cb of checkboxes) {
        cb.addEventListener('change', () => {
          reflectCheckedState(container)
        })
      }
    }

    if (newTagsInput) {
      const previewContainer = document.createElement('div')
      safeSetAttribute(previewContainer, 'class', 'flex flex-wrap gap-2 mt-1')
      safeSetAttribute(previewContainer, 'data-testid', 'new-tag-preview-chips')
      newTagsInput.insertAdjacentElement('afterend', previewContainer)

      const update = () => {
        const tokens = parseNewTagTokens(newTagsInput.value)
        renderOptimisticChips(previewContainer, tokens)
      }

      newTagsInput.addEventListener('input', update)
      update()
    }
  }

  const init = () => {
    try {
      const containers = document.querySelectorAll('[data-testid="tag-chip-checkboxes"]')
      const newTagsInputs = document.querySelectorAll('input[name="newTags"]')

      if (containers.length === 0 && newTagsInputs.length === 0) {
        return
      }

      const processed = new Set()

      for (const el of containers) {
        const parent = el.closest('div[class]') ?? el.parentElement
        if (parent && !processed.has(parent)) {
          processed.add(parent)
          try {
            initContainer(parent)
          } catch (err) {
            console.error('[tag-chip-checkboxes] failed to init container:', err)
          }
        }
      }

      for (const input of newTagsInputs) {
        const parent = input.closest('div[class]') ?? input.parentElement
        if (parent && !processed.has(parent)) {
          processed.add(parent)
          try {
            initContainer(parent)
          } catch (err) {
            console.error('[tag-chip-checkboxes] failed to init container:', err)
          }
        }
      }
    } catch (err) {
      console.error('[tag-chip-checkboxes] init failed:', err)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
