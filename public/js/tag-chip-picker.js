/**
 * Progressive-enhancement tag chip picker.
 *
 * Auto-initialises on every input carrying `data-tag-chip-picker`.
 * Reads the embedded `tags-data` JSON block, replaces the plain text input
 * with a chip UI, and keeps a hidden `name="tags"` input synchronised so the
 * server sees the same CSV value whether JS is on or off.
 */

const controllers = new WeakMap()

let nextId = 0
const uid = () => `tcp-${nextId++}`

const makeSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const parseTagCsv = (csv) => {
  if (!csv) {
    return []
  }
  return csv
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

const createController = (originalInput, allTags) => {
  const parent = originalInput.parentElement
  const wrapperId = uid()

  // Hide original input (keep it for form submission)
  originalInput.type = 'hidden'
  originalInput.removeAttribute('data-tag-chip-picker')

  // Build visible UI wrapper
  const wrapper = document.createElement('div')
  wrapper.id = wrapperId
  wrapper.setAttribute('role', 'region')
  wrapper.setAttribute('aria-label', 'Tag chip picker')

  const chipsArea = document.createElement('div')
  chipsArea.setAttribute('data-testid', 'tag-chip-picker-chips')

  const textInput = document.createElement('input')
  textInput.type = 'text'
  textInput.setAttribute('aria-autocomplete', 'list')
  textInput.setAttribute('aria-controls', `${wrapperId}-suggestions`)
  textInput.setAttribute('placeholder', 'e.g. food, groceries')

  const suggestions = document.createElement('ul')
  suggestions.id = `${wrapperId}-suggestions`
  suggestions.setAttribute('role', 'listbox')
  suggestions.style.display = 'none'

  wrapper.appendChild(chipsArea)
  wrapper.appendChild(textInput)
  wrapper.appendChild(suggestions)
  parent.appendChild(wrapper)

  const state = {
    tags: parseTagCsv(originalInput.value),
    allTags,
    filter: '',
    activeIndex: -1,
    open: false,
  }

  const syncInput = () => {
    originalInput.value = state.tags.join(',')
  }

  const setOpen = (value) => {
    state.open = value
    if (!value) {
      suggestions.style.display = 'none'
      textInput.setAttribute('aria-activedescendant', '')
    }
  }

  const getTags = () => state.tags
  const setTags = (tags) => {
    state.tags = tags
    syncInput()
  }
  const getAllTags = () => state.allTags
  const openDropdown = () => {
    setOpen(true)
  }
  const closeDropdown = () => {
    setOpen(false)
  }

  const addTag = (tag) => {
    const normalized = tag.trim().toLowerCase()
    if (!normalized || state.tags.includes(normalized)) {
      return
    }
    state.tags.push(normalized)
    syncInput()
    state.filter = ''
    textInput.value = ''
    state.activeIndex = -1
    render()
  }

  const removeTag = (tag) => {
    state.tags = state.tags.filter((t) => t !== tag)
    syncInput()
    render()
  }

  const getFiltered = () => {
    const term = state.filter.trim().toLowerCase()
    if (!term) {
      return state.allTags.filter((t) => !state.tags.includes(t.name))
    }
    return state.allTags
      .filter((t) => !state.tags.includes(t.name))
      .filter((t) => t.name.toLowerCase().includes(term))
  }

  const hasExactMatch = () => {
    const term = state.filter.trim().toLowerCase()
    if (!term) {
      return false
    }
    return state.allTags.some((t) => t.name.toLowerCase() === term)
  }

  const renderChips = () => {
    chipsArea.innerHTML = ''
    state.tags.forEach((tag) => {
      const chip = document.createElement('span')
      chip.className = 'badge badge-primary mr-1 mb-1'
      chip.textContent = tag

      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.setAttribute('aria-label', `Remove ${tag}`)
      removeBtn.setAttribute('data-testid', `tag-chip-picker-remove-${makeSlug(tag)}`)
      removeBtn.textContent = '\u00D7'
      removeBtn.style.marginLeft = '4px'
      removeBtn.style.cursor = 'pointer'
      removeBtn.addEventListener('click', () => removeTag(tag))

      chip.appendChild(removeBtn)
      chipsArea.appendChild(chip)
    })
  }

  const renderSuggestions = () => {
    suggestions.innerHTML = ''
    const filtered = getFiltered()
    const showCreate =
      state.filter.trim() !== '' && !hasExactMatch() && !state.tags.includes(state.filter.trim().toLowerCase())

    filtered.forEach((tag, index) => {
      const li = document.createElement('li')
      li.id = `${wrapperId}-opt-${index}`
      li.setAttribute('role', 'option')
      li.setAttribute('data-testid', `tag-chip-picker-option-${makeSlug(tag.name)}`)
      li.textContent = tag.name
      li.style.cursor = 'pointer'
      li.addEventListener('mousedown', (e) => {
        e.preventDefault()
        addTag(tag.name)
      })
      if (index === state.activeIndex) {
        li.setAttribute('aria-selected', 'true')
        textInput.setAttribute('aria-activedescendant', li.id)
      } else {
        li.setAttribute('aria-selected', 'false')
      }
      suggestions.appendChild(li)
    })

    if (showCreate) {
      const createIndex = filtered.length
      const li = document.createElement('li')
      li.id = `${wrapperId}-opt-${createIndex}`
      li.setAttribute('role', 'option')
      li.setAttribute('data-testid', 'tag-chip-picker-create')
      li.textContent = `Create '${state.filter}'`
      li.style.cursor = 'pointer'
      li.addEventListener('mousedown', (e) => {
        e.preventDefault()
        addTag(state.filter)
      })
      if (createIndex === state.activeIndex) {
        li.setAttribute('aria-selected', 'true')
        textInput.setAttribute('aria-activedescendant', li.id)
      } else {
        li.setAttribute('aria-selected', 'false')
      }
      suggestions.appendChild(li)
    }

    if (filtered.length === 0 && !showCreate) {
      const li = document.createElement('li')
      li.setAttribute('role', 'option')
      li.setAttribute('aria-disabled', 'true')
      li.textContent = 'No matches'
      suggestions.appendChild(li)
    }

    if (state.open) {
      suggestions.style.display = 'block'
    }
  }

  const render = () => {
    renderChips()
    renderSuggestions()
  }

  const selectActive = () => {
    const filtered = getFiltered()
    const showCreate =
      state.filter.trim() !== '' && !hasExactMatch() && !state.tags.includes(state.filter.trim().toLowerCase())
    const total = filtered.length + (showCreate ? 1 : 0)
    if (state.activeIndex < 0 || total === 0) {
      if (state.filter.trim()) {
        addTag(state.filter)
      }
      setOpen(false)
      return
    }
    if (state.activeIndex < filtered.length) {
      addTag(filtered[state.activeIndex].name)
    } else {
      addTag(state.filter)
    }
  }

  const adjustIndex = (delta) => {
    const filtered = getFiltered()
    const showCreate =
      state.filter.trim() !== '' && !hasExactMatch() && !state.tags.includes(state.filter.trim().toLowerCase())
    const total = filtered.length + (showCreate ? 1 : 0)
    if (total === 0) {
      state.activeIndex = -1
      return
    }
    let next = state.activeIndex + delta
    if (next < 0) {
      next = total - 1
    }
    if (next >= total) {
      next = 0
    }
    state.activeIndex = next
  }

  const onInput = () => {
    state.filter = textInput.value
    state.activeIndex = -1
    render()
  }

  const onFocus = () => {
    setOpen(true)
    render()
  }

  const onBlur = (e) => {
    if (suggestions.contains(e.relatedTarget)) {
      return
    }
    setOpen(false)
  }

  const onKeydown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      adjustIndex(1)
      render()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      adjustIndex(-1)
      render()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      selectActive()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'Tab') {
      setOpen(false)
      return
    }
    if (e.key === 'Backspace' && textInput.value === '') {
      e.preventDefault()
      if (state.tags.length > 0) {
        removeTag(state.tags[state.tags.length - 1])
      }
      return
    }
    if (e.key === ',') {
      e.preventDefault()
      if (state.filter.trim()) {
        addTag(state.filter)
      }
      return
    }
  }

  textInput.addEventListener('input', onInput)
  textInput.addEventListener('focus', onFocus)
  textInput.addEventListener('blur', onBlur)
  textInput.addEventListener('keydown', onKeydown)

  // Initial render
  render()

  return {
    getTags,
    setTags,
    getAllTags,
    open: openDropdown,
    close: closeDropdown,
  }
}

const init = () => {
  const inputs = document.querySelectorAll('[data-tag-chip-picker]')
  if (inputs.length === 0) {
    return
  }
  const dataEl = document.querySelector('[data-testid="tags-data"]')
  if (!dataEl) {
    return
  }
  let tags = []
  try {
    tags = JSON.parse(dataEl.textContent)
  } catch {
    return
  }
  inputs.forEach((input) => {
    const controller = createController(input, tags)
    controllers.set(input, controller)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
