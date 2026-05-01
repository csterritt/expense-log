/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Progressive-enhancement tag chip picker for the expenses entry form.
 * Self-contained vanilla JS — no frameworks, no build step, no imports.
 *
 * Activation hook: any <input data-tag-chip-picker> on the page.
 * Data source:    <script type="application/json" data-testid="tags-data">
 * Server contract: keeps the original input (now type="hidden") populated
 *                  with the same comma-separated CSV the no-JS path would
 *                  POST, so the server flow is identical.
 */
;(() => {
  'use strict'

  const controllers = new WeakMap()
  let nextId = 0

  const slugify = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'

  // Local copy of the server's parseTagCsv normalization. Splits on commas,
  // trims, drops empties, lower-cases, and de-duplicates by first
  // appearance. Kept in sync with src/lib/expense-validators.ts on purpose.
  const parseTagCsv = (input) => {
    const raw = typeof input === 'string' ? input : ''
    const seen = new Set()
    const result = []
    for (const piece of raw.split(',')) {
      const trimmed = piece.trim()
      if (trimmed.length === 0) {
        continue
      }
      const lowered = trimmed.toLowerCase()
      if (seen.has(lowered)) {
        continue
      }
      seen.add(lowered)
      result.push(lowered)
    }
    return result
  }

  const serializeChips = (chips) => chips.join(',')

  const readTags = () => {
    const node = document.querySelector('script[data-testid="tags-data"]')
    if (!node) {
      return []
    }
    try {
      const parsed = JSON.parse(node.textContent || '[]')
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed
        .map((row) => (row && typeof row.name === 'string' ? { name: row.name } : null))
        .filter((row) => row !== null)
    } catch (_e) {
      return []
    }
  }

  const createController = (originalInput, allTags) => {
    const id = `tag-chip-picker-${nextId++}`
    const listId = `${id}-listbox`

    // Initial chips parsed from current value.
    let chips = parseTagCsv(originalInput.value || '')

    // Build wrapper DOM around the original input.
    const wrapper = document.createElement('div')
    wrapper.className = 'flex flex-col gap-2 w-full'
    originalInput.parentNode.insertBefore(wrapper, originalInput)

    const surface = document.createElement('div')
    surface.setAttribute('data-testid', 'tag-chip-picker-surface')
    surface.className =
      'flex flex-wrap gap-1 items-center min-h-10 p-2 rounded-box border border-base-300 bg-base-100'

    const chipsContainer = document.createElement('div')
    chipsContainer.className = 'flex flex-wrap gap-1 items-center'
    surface.appendChild(chipsContainer)

    const searchWrap = document.createElement('div')
    searchWrap.className = 'relative w-full'

    const search = document.createElement('input')
    search.type = 'text'
    search.setAttribute('data-testid', 'tag-chip-picker-input')
    search.setAttribute('role', 'combobox')
    search.setAttribute('aria-autocomplete', 'list')
    search.setAttribute('aria-expanded', 'false')
    search.setAttribute('aria-controls', listId)
    search.setAttribute('aria-owns', listId)
    search.setAttribute('autocomplete', 'off')
    search.placeholder = 'Type to add a tag'
    search.className = 'input input-bordered w-full'
    searchWrap.appendChild(search)

    const suggestions = document.createElement('ul')
    suggestions.id = listId
    suggestions.setAttribute('role', 'listbox')
    suggestions.setAttribute('data-testid', 'tag-chip-picker-list')
    suggestions.hidden = true
    suggestions.className =
      'menu menu-sm bg-base-100 rounded-box shadow border border-base-300 z-50 absolute w-full max-h-60 overflow-auto p-1'
    searchWrap.appendChild(suggestions)

    wrapper.appendChild(surface)
    wrapper.appendChild(searchWrap)

    // Convert original input to hidden and move it inside the wrapper so
    // the form still picks it up.
    originalInput.type = 'hidden'
    originalInput.removeAttribute('placeholder')
    originalInput.value = serializeChips(chips)
    wrapper.appendChild(originalInput)

    let activeIndex = -1
    let currentRows = []

    const setExpanded = (open) => {
      search.setAttribute('aria-expanded', open ? 'true' : 'false')
      suggestions.hidden = !open
    }

    const syncHidden = () => {
      originalInput.value = serializeChips(chips)
    }

    const renderChips = () => {
      chipsContainer.textContent = ''
      for (const name of chips) {
        const chip = document.createElement('span')
        chip.setAttribute('data-testid', `tag-chip-${slugify(name)}`)
        chip.className = 'badge badge-primary gap-1 py-3'
        const label = document.createElement('span')
        label.textContent = name
        chip.appendChild(label)
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.setAttribute('data-testid', `tag-chip-${slugify(name)}-remove`)
        remove.setAttribute('aria-label', `Remove ${name}`)
        remove.className = 'btn btn-xs btn-ghost btn-circle'
        remove.textContent = '×'
        remove.addEventListener('click', () => {
          removeChip(name)
        })
        chip.appendChild(remove)
        chipsContainer.appendChild(chip)
      }
    }

    const clearActive = () => {
      activeIndex = -1
      search.removeAttribute('aria-activedescendant')
      const prev = suggestions.querySelectorAll('[data-active="true"]')
      for (const el of prev) {
        el.setAttribute('data-active', 'false')
        el.classList.remove('bg-primary', 'text-primary-content')
      }
    }

    const setActive = (index) => {
      const items = suggestions.querySelectorAll('[role="option"]')
      if (items.length === 0) {
        clearActive()
        return
      }
      const clamped = ((index % items.length) + items.length) % items.length
      clearActive()
      activeIndex = clamped
      const el = items[clamped]
      el.setAttribute('data-active', 'true')
      el.classList.add('bg-primary', 'text-primary-content')
      search.setAttribute('aria-activedescendant', el.id)
      el.scrollIntoView({ block: 'nearest' })
    }

    const renderSuggestions = () => {
      const typedRaw = search.value
      const typed = typedRaw.trim().toLowerCase()
      suggestions.textContent = ''
      currentRows = []

      const chosen = new Set(chips)
      let matches = []
      if (typed.length === 0) {
        matches = allTags.filter((row) => !chosen.has(row.name.toLowerCase()))
      } else {
        matches = allTags.filter((row) => {
          const n = row.name.toLowerCase()
          return n.includes(typed) && !chosen.has(n)
        })
      }

      let i = 0
      for (const row of matches) {
        const optionId = `${id}-opt-${i}`
        const li = document.createElement('li')
        const btn = document.createElement('a')
        btn.id = optionId
        btn.setAttribute('role', 'option')
        btn.setAttribute('data-testid', `tag-chip-picker-option-${slugify(row.name)}`)
        btn.setAttribute('data-value', row.name)
        btn.textContent = row.name
        btn.className = 'cursor-pointer'
        btn.addEventListener('mousedown', (ev) => {
          ev.preventDefault()
          addChip(row.name)
        })
        li.appendChild(btn)
        suggestions.appendChild(li)
        currentRows.push({ kind: 'existing', name: row.name })
        i++
      }

      const exact = allTags.some((row) => row.name.toLowerCase() === typed)
      const alreadyChosen = chosen.has(typed)
      if (typed.length > 0 && !exact && !alreadyChosen) {
        const optionId = `${id}-opt-create`
        const li = document.createElement('li')
        const btn = document.createElement('a')
        btn.id = optionId
        btn.setAttribute('role', 'option')
        btn.setAttribute('data-testid', 'tag-chip-picker-create')
        btn.setAttribute('data-value', typed)
        btn.textContent = `Create '${typed}'`
        btn.className = 'cursor-pointer italic'
        btn.addEventListener('mousedown', (ev) => {
          ev.preventDefault()
          addChip(typed)
        })
        li.appendChild(btn)
        suggestions.appendChild(li)
        currentRows.push({ kind: 'create', name: typed })
      }

      if (currentRows.length === 0) {
        const li = document.createElement('li')
        const span = document.createElement('span')
        span.className = 'opacity-60 px-2 py-1'
        span.textContent = 'No matches'
        li.appendChild(span)
        suggestions.appendChild(li)
      }

      activeIndex = -1
      search.removeAttribute('aria-activedescendant')
    }

    const addChip = (rawName) => {
      const lowered = String(rawName || '')
        .trim()
        .toLowerCase()
      if (lowered.length === 0) {
        return
      }
      if (chips.includes(lowered)) {
        return
      }
      chips.push(lowered)
      syncHidden()
      renderChips()
      search.value = ''
      renderSuggestions()
      setExpanded(true)
      search.focus()
    }

    const removeChip = (name) => {
      const idx = chips.indexOf(name)
      if (idx === -1) {
        return
      }
      chips.splice(idx, 1)
      syncHidden()
      renderChips()
      renderSuggestions()
    }

    const open = () => {
      renderSuggestions()
      setExpanded(true)
    }

    const close = () => {
      setExpanded(false)
      clearActive()
    }

    search.addEventListener('focus', () => {
      open()
    })

    search.addEventListener('input', () => {
      open()
    })

    search.addEventListener('blur', () => {
      setTimeout(() => {
        close()
      }, 0)
    })

    search.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        if (suggestions.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex + 1)
        return
      }
      if (ev.key === 'ArrowUp') {
        if (suggestions.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex - 1)
        return
      }
      if (ev.key === 'Escape') {
        if (!suggestions.hidden) {
          ev.preventDefault()
          close()
        }
        return
      }
      if (ev.key === 'Enter' || ev.key === ',') {
        ev.preventDefault()
        if (!suggestions.hidden && activeIndex >= 0 && currentRows[activeIndex]) {
          addChip(currentRows[activeIndex].name)
          return
        }
        const typed = search.value.trim()
        if (typed.length > 0) {
          addChip(typed)
        }
        return
      }
      if (ev.key === 'Backspace') {
        if (search.value.length === 0 && chips.length > 0) {
          ev.preventDefault()
          removeChip(chips[chips.length - 1])
        }
        return
      }
    })

    document.addEventListener('mousedown', (ev) => {
      if (!wrapper.contains(ev.target)) {
        close()
      }
    })

    // Initial paint.
    renderChips()
    syncHidden()

    return {
      getChips: () => chips.slice(),
      setChips: (next) => {
        chips = parseTagCsv(Array.isArray(next) ? next.join(',') : String(next || ''))
        syncHidden()
        renderChips()
        renderSuggestions()
      },
      addChip,
      removeChip,
    }
  }

  const init = () => {
    const inputs = document.querySelectorAll('[data-tag-chip-picker]')
    if (inputs.length === 0) {
      return
    }
    const tags = readTags()
    for (const input of inputs) {
      if (controllers.has(input)) {
        continue
      }
      controllers.set(input, createController(input, tags))
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
