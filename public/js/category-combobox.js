/**
 * Progressive-enhancement category combobox.
 *
 * Auto-initialises on every input carrying `data-category-combobox`.
 * Reads the embedded `categories-data` JSON block and turns the plain text
 * input into a searchable dropdown. Falls back to the no-JS text input when
 * this module is not loaded.
 */

const controllers = new WeakMap()

let nextId = 0
const uid = () => `cc-${nextId++}`

const makeSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const createController = (input, categories) => {
  const listboxId = uid()
  const listbox = document.createElement('ul')
  listbox.id = listboxId
  listbox.setAttribute('role', 'listbox')
  listbox.setAttribute('data-testid', 'category-combobox-dropdown')
  listbox.style.display = 'none'
  input.parentElement.appendChild(listbox)

  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', listboxId)
  input.setAttribute('aria-owns', listboxId)
  input.setAttribute('aria-expanded', 'false')

  const state = {
    categories,
    filter: '',
    activeIndex: -1,
    open: false,
  }

  const setOpen = (value) => {
    state.open = value
    input.setAttribute('aria-expanded', value ? 'true' : 'false')
    if (!value) {
      listbox.style.display = 'none'
      input.setAttribute('aria-activedescendant', '')
    }
  }

  const getValue = () => input.value
  const setValue = (value) => {
    input.value = value
  }
  const getCategories = () => state.categories
  const openDropdown = () => {
    setOpen(true)
  }
  const closeDropdown = () => {
    setOpen(false)
  }

  const getFiltered = () => {
    const term = state.filter.trim().toLowerCase()
    if (!term) {
      return state.categories
    }
    return state.categories.filter((c) =>
      c.name.toLowerCase().includes(term),
    )
  }

  const hasExactMatch = () => {
    const term = state.filter.trim().toLowerCase()
    if (!term) {
      return false
    }
    return state.categories.some((c) => c.name.toLowerCase() === term)
  }

  const commitValue = (value) => {
    setValue(value)
    setOpen(false)
    input.focus()
  }

  const render = () => {
    listbox.innerHTML = ''
    const filtered = getFiltered()
    const showCreate =
      state.filter.trim() !== '' && !hasExactMatch()

    filtered.forEach((cat, index) => {
      const li = document.createElement('li')
      li.id = `${listboxId}-opt-${index}`
      li.setAttribute('role', 'option')
      li.setAttribute('data-testid', `category-combobox-option-${makeSlug(cat.name)}`)
      li.textContent = cat.name
      li.style.cursor = 'pointer'
      li.addEventListener('mousedown', (e) => {
        e.preventDefault()
        commitValue(cat.name)
      })
      if (index === state.activeIndex) {
        li.setAttribute('aria-selected', 'true')
        input.setAttribute('aria-activedescendant', li.id)
      } else {
        li.setAttribute('aria-selected', 'false')
      }
      listbox.appendChild(li)
    })

    if (showCreate) {
      const createIndex = filtered.length
      const li = document.createElement('li')
      li.id = `${listboxId}-opt-${createIndex}`
      li.setAttribute('role', 'option')
      li.setAttribute('data-testid', 'category-combobox-create')
      li.textContent = `Create '${state.filter}'`
      li.style.cursor = 'pointer'
      li.addEventListener('mousedown', (e) => {
        e.preventDefault()
        commitValue(state.filter)
      })
      if (createIndex === state.activeIndex) {
        li.setAttribute('aria-selected', 'true')
        input.setAttribute('aria-activedescendant', li.id)
      } else {
        li.setAttribute('aria-selected', 'false')
      }
      listbox.appendChild(li)
    }

    if (filtered.length === 0 && !showCreate) {
      const li = document.createElement('li')
      li.setAttribute('role', 'option')
      li.setAttribute('aria-disabled', 'true')
      li.textContent = 'No matches'
      listbox.appendChild(li)
    }

    if (state.open) {
      listbox.style.display = 'block'
    }
  }

  const selectActive = () => {
    const filtered = getFiltered()
    const showCreate =
      state.filter.trim() !== '' && !hasExactMatch()
    const total = filtered.length + (showCreate ? 1 : 0)
    if (state.activeIndex < 0 || total === 0) {
      setOpen(false)
      return
    }
    if (state.activeIndex < filtered.length) {
      commitValue(filtered[state.activeIndex].name)
    } else {
      commitValue(state.filter)
    }
  }

  const adjustIndex = (delta) => {
    const filtered = getFiltered()
    const showCreate =
      state.filter.trim() !== '' && !hasExactMatch()
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
    state.filter = input.value
    state.activeIndex = -1
    render()
  }

  const onFocus = () => {
    setOpen(true)
    render()
  }

  const onBlur = (e) => {
    if (listbox.contains(e.relatedTarget)) {
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
  }

  input.addEventListener('input', onInput)
  input.addEventListener('focus', onFocus)
  input.addEventListener('blur', onBlur)
  input.addEventListener('keydown', onKeydown)

  return {
    getValue,
    setValue,
    getCategories,
    open: openDropdown,
    close: closeDropdown,
  }
}

const init = () => {
  const inputs = document.querySelectorAll('[data-category-combobox]')
  if (inputs.length === 0) {
    return
  }
  const dataEl = document.querySelector('[data-testid="categories-data"]')
  if (!dataEl) {
    return
  }
  let categories = []
  try {
    categories = JSON.parse(dataEl.textContent)
  } catch {
    return
  }
  inputs.forEach((input) => {
    const controller = createController(input, categories)
    controllers.set(input, controller)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
