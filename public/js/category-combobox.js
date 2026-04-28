/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Progressive-enhancement category combobox for the expenses entry form.
 * Self-contained vanilla JS — no frameworks, no build step, no imports.
 *
 * Activation hook: any <input data-category-combobox> on the page.
 * Data source:    <script type="application/json" data-testid="categories-data">
 * Server contract: writes the chosen / typed name verbatim into the
 *                  underlying input so the form POST is byte-identical to
 *                  the no-JS path.
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

  const readCategories = () => {
    const node = document.querySelector('script[data-testid="categories-data"]')
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

  const filterMatches = (categories, typed) => {
    const needle = typed.trim().toLowerCase()
    if (needle.length === 0) {
      return categories.slice()
    }
    return categories.filter((row) => row.name.toLowerCase().includes(needle))
  }

  const hasExactMatch = (categories, typed) => {
    const needle = typed.trim().toLowerCase()
    if (needle.length === 0) {
      return true
    }
    for (const row of categories) {
      if (row.name.toLowerCase() === needle) {
        return true
      }
    }
    return false
  }

  const createController = (input, categories) => {
    const id = `category-combobox-${nextId++}`
    const listId = `${id}-listbox`

    const dropdown = document.createElement('ul')
    dropdown.id = listId
    dropdown.setAttribute('role', 'listbox')
    dropdown.setAttribute('data-testid', 'category-combobox-dropdown')
    dropdown.hidden = true
    dropdown.className =
      'menu menu-sm bg-base-100 rounded-box shadow border border-base-300 z-50 absolute w-full max-h-60 overflow-auto p-1'

    const wrapper = document.createElement('div')
    wrapper.className = 'relative'
    input.parentNode.insertBefore(wrapper, input)
    wrapper.appendChild(input)
    wrapper.appendChild(dropdown)

    input.setAttribute('role', 'combobox')
    input.setAttribute('aria-autocomplete', 'list')
    input.setAttribute('aria-expanded', 'false')
    input.setAttribute('aria-controls', listId)
    input.setAttribute('aria-owns', listId)
    input.setAttribute('autocomplete', 'off')

    let activeIndex = -1
    let currentRows = []

    const setExpanded = (open) => {
      input.setAttribute('aria-expanded', open ? 'true' : 'false')
      dropdown.hidden = !open
    }

    const clearActive = () => {
      activeIndex = -1
      input.removeAttribute('aria-activedescendant')
      const prev = dropdown.querySelectorAll('[data-active="true"]')
      for (const el of prev) {
        el.setAttribute('data-active', 'false')
        el.classList.remove('bg-primary', 'text-primary-content')
      }
    }

    const setActive = (index) => {
      const items = dropdown.querySelectorAll('[role="option"]')
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
      input.setAttribute('aria-activedescendant', el.id)
      el.scrollIntoView({ block: 'nearest' })
    }

    const buildOption = (name, optionId, testid) => {
      const li = document.createElement('li')
      const btn = document.createElement('a')
      btn.id = optionId
      btn.setAttribute('role', 'option')
      btn.setAttribute('data-testid', testid)
      btn.setAttribute('data-value', name)
      btn.textContent = name
      btn.className = 'cursor-pointer'
      btn.addEventListener('mousedown', (ev) => {
        ev.preventDefault()
        commitValue(name)
        close()
      })
      li.appendChild(btn)
      return li
    }

    const render = () => {
      const typed = input.value
      const matches = filterMatches(categories, typed)
      const exact = hasExactMatch(categories, typed)
      const trimmed = typed.trim()
      const showCreate = trimmed.length > 0 && !exact

      dropdown.textContent = ''
      currentRows = []

      let i = 0
      for (const row of matches) {
        const optionId = `${id}-opt-${i}`
        const li = buildOption(row.name, optionId, `category-combobox-option-${slugify(row.name)}`)
        dropdown.appendChild(li)
        currentRows.push({ kind: 'existing', name: row.name })
        i++
      }
      if (showCreate) {
        const optionId = `${id}-opt-create`
        const li = document.createElement('li')
        const btn = document.createElement('a')
        btn.id = optionId
        btn.setAttribute('role', 'option')
        btn.setAttribute('data-testid', 'category-combobox-create')
        btn.setAttribute('data-value', trimmed)
        btn.textContent = `Create '${trimmed}'`
        btn.className = 'cursor-pointer italic'
        btn.addEventListener('mousedown', (ev) => {
          ev.preventDefault()
          commitValue(trimmed)
          close()
        })
        li.appendChild(btn)
        dropdown.appendChild(li)
        currentRows.push({ kind: 'create', name: trimmed })
      }

      if (currentRows.length === 0) {
        const li = document.createElement('li')
        const span = document.createElement('span')
        span.className = 'opacity-60 px-2 py-1'
        span.textContent = 'No matches'
        li.appendChild(span)
        dropdown.appendChild(li)
      }

      activeIndex = -1
      input.removeAttribute('aria-activedescendant')
    }

    const commitValue = (value) => {
      input.value = value
    }

    const open = () => {
      render()
      setExpanded(true)
    }

    const close = () => {
      setExpanded(false)
      clearActive()
    }

    input.addEventListener('focus', () => {
      open()
    })

    input.addEventListener('input', () => {
      open()
    })

    input.addEventListener('blur', () => {
      // small timeout so click on option (mousedown handles preventDefault)
      setTimeout(() => {
        close()
      }, 0)
    })

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        if (dropdown.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex + 1)
        return
      }
      if (ev.key === 'ArrowUp') {
        if (dropdown.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex - 1)
        return
      }
      if (ev.key === 'Escape') {
        if (!dropdown.hidden) {
          ev.preventDefault()
          close()
        }
        return
      }
      if (ev.key === 'Enter') {
        if (!dropdown.hidden && activeIndex >= 0 && currentRows[activeIndex]) {
          ev.preventDefault()
          commitValue(currentRows[activeIndex].name)
          close()
        }
        return
      }
      if (ev.key === 'Tab') {
        if (!dropdown.hidden && activeIndex >= 0 && currentRows[activeIndex]) {
          commitValue(currentRows[activeIndex].name)
        }
        close()
        return
      }
    })

    document.addEventListener('mousedown', (ev) => {
      if (!wrapper.contains(ev.target)) {
        close()
      }
    })

    return {
      getValue: () => input.value,
      setValue: (v) => {
        input.value = v
      },
      getCategories: () => categories.slice(),
      open,
      close,
    }
  }

  const init = () => {
    const inputs = document.querySelectorAll('[data-category-combobox]')
    if (inputs.length === 0) {
      return
    }
    const categories = readCategories()
    for (const input of inputs) {
      if (controllers.has(input)) {
        continue
      }
      controllers.set(input, createController(input, categories))
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
