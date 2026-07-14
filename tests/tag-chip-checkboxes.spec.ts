// ====================================
// Tests for TagChipCheckboxes component
// To run this, cd to this directory and type 'bun test'
// ====================================

import { describe, it } from 'bun:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

import { TagChipCheckboxes, CHIP_CLASS_BASE, CHIP_CLASS_SELECTED } from '../src/components/tag-chip-checkboxes'

type Tag = { id: string; name: string }

const FOOD_ID = '01HZQKXZJ2A3B4C5D6E7F8G9HA'
const GIFT_ID = '01HZQKXZJ2A3B4C5D6E7F8G9HB'
const LEGO_ID = '01HZQKXZJ2A3B4C5D6E7F8G9HC'

const SAMPLE_TAGS: Tag[] = [
  { id: FOOD_ID, name: 'food' },
  { id: GIFT_ID, name: 'gift' },
  { id: LEGO_ID, name: 'lego' },
]

const render = (el: unknown): string => String(el)

describe('TagChipCheckboxes', () => {
  describe('basic chip rendering', () => {
    it('renders a checkbox for each supplied tag', () => {
      const html = render(TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(html.includes(`type="checkbox"`), 'expected checkbox inputs')
      assert.ok(html.includes(`name="tagId"`), 'expected name="tagId"')
      assert.ok(html.includes(`value="${FOOD_ID}"`), 'expected food chip value')
      assert.ok(html.includes(`value="${GIFT_ID}"`), 'expected gift chip value')
      assert.ok(html.includes(`value="${LEGO_ID}"`), 'expected lego chip value')
    })

    it('renders tag labels', () => {
      const html = render(TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(html.includes('food'), 'expected food label')
      assert.ok(html.includes('gift'), 'expected gift label')
      assert.ok(html.includes('lego'), 'expected lego label')
    })

    it('wraps chips with flex-wrap and gap-2', () => {
      const html = render(TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(html.includes('flex-wrap'), 'expected flex-wrap class')
      assert.ok(html.includes('gap-2'), 'expected gap-2 class')
    })
  })

  describe('alphabetical ordering', () => {
    it('renders tags in alphabetical order case-insensitively', () => {
      const unordered: Tag[] = [
        { id: LEGO_ID, name: 'Lego' },
        { id: FOOD_ID, name: 'food' },
        { id: GIFT_ID, name: 'Gift' },
      ]
      const html = render(TagChipCheckboxes({ tags: unordered, selectedTagIds: new Set(), allowNewTags: false }))
      const foodPos = html.indexOf('food')
      const giftPos = html.indexOf('Gift')
      const legoPos = html.indexOf('Lego')
      assert.ok(foodPos < giftPos, `expected food before Gift (${foodPos} < ${giftPos})`)
      assert.ok(giftPos < legoPos, `expected Gift before Lego (${giftPos} < ${legoPos})`)
    })
  })

  describe('selected vs unselected chips', () => {
    it('selected chip has checked attribute', () => {
      const html = render(
        TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set([FOOD_ID]), allowNewTags: false }),
      )
      assert.ok(html.includes('checked'), 'expected checked attribute on selected chip')
    })

    it('unselected chips do not have checked', () => {
      const html = render(
        TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set([FOOD_ID]), allowNewTags: false }),
      )
      const giftStart = html.indexOf(`value="${GIFT_ID}"`)
      const giftSection = html.slice(Math.max(0, giftStart - 50), giftStart + 100)
      assert.ok(!giftSection.includes('checked'), 'expected gift chip NOT to be checked')
    })

    it('selected chips have a visually distinct class hook', () => {
      const withSelected = render(
        TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set([FOOD_ID]), allowNewTags: false }),
      )
      const withNone = render(
        TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: false }),
      )
      assert.notStrictEqual(withSelected, withNone, 'expected HTML to differ when a chip is selected')
    })
  })

  describe('XSS safety', () => {
    it('renders HTML metacharacters in tag name safely via JSX escaping', () => {
      const xssTags: Tag[] = [{ id: FOOD_ID, name: '<script>alert(1)</script>' }]
      const html = render(TagChipCheckboxes({ tags: xssTags, selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script tag must not appear in output')
      assert.ok(html.includes('&lt;script&gt;') || html.includes('&amp;lt;'), 'script tag must be escaped')
    })
  })

  describe('allowNewTags prop', () => {
    it('renders a newTags text input when allowNewTags=true', () => {
      const html = render(TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: true }))
      assert.ok(html.includes('name="newTags"'), 'expected newTags input')
      assert.ok(html.includes('type="text"'), 'expected text input for newTags')
    })

    it('does not render a newTags text input when allowNewTags=false', () => {
      const html = render(TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(!html.includes('name="newTags"'), 'expected no newTags input on filter form')
    })

    it('populates newTags input with newTagsValue when provided', () => {
      const html = render(
        TagChipCheckboxes({
          tags: SAMPLE_TAGS,
          selectedTagIds: new Set(),
          allowNewTags: true,
          newTagsValue: 'coffee, tea',
        }),
      )
      assert.ok(html.includes('coffee, tea'), 'expected newTagsValue in newTags input')
    })
  })

  describe('empty tag list', () => {
    it('renders no checkboxes when tag list is empty', () => {
      const html = render(TagChipCheckboxes({ tags: [], selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(!html.includes('type="checkbox"'), 'expected no checkboxes for empty tag list')
    })

    it('renders the newTags input and a no-tags hint on mutation forms (allowNewTags=true)', () => {
      const html = render(TagChipCheckboxes({ tags: [], selectedTagIds: new Set(), allowNewTags: true }))
      assert.ok(html.includes('name="newTags"'), 'expected newTags input even with empty tag list')
      assert.ok(html.includes('No tags yet'), 'expected empty-state hint on mutation form')
    })

    it('renders neither chips nor input on filter forms with empty tag list (allowNewTags=false)', () => {
      const html = render(TagChipCheckboxes({ tags: [], selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(!html.includes('name="newTags"'), 'expected no newTags input on filter form')
      assert.ok(!html.includes('type="checkbox"'), 'expected no chips on filter form with empty tag list')
    })
  })

  describe('no-JS and dropdown-free', () => {
    it('uses native checkbox inputs, not a select/dropdown', () => {
      const html = render(TagChipCheckboxes({ tags: SAMPLE_TAGS, selectedTagIds: new Set(), allowNewTags: false }))
      assert.ok(!html.includes('<select'), 'expected no select element')
      assert.ok(!html.includes('role="listbox"'), 'expected no listbox role (no dropdown)')
      assert.ok(html.includes('type="checkbox"'), 'expected native checkbox inputs')
    })
  })
})

describe('TagChipCheckboxes JS/TSX constant parity', () => {
  const jsFilePath = path.resolve(__dirname, '../public/js/tag-chip-checkboxes.js')
  const jsText = fs.readFileSync(jsFilePath, 'utf8')

  it('JS file declares CHIP_CLASS_BASE matching the TSX constant', () => {
    const expected = `const CHIP_CLASS_BASE = '${CHIP_CLASS_BASE}'`
    assert.ok(
      jsText.includes(expected),
      `expected JS file to contain:\n  ${expected}\n\nActual CHIP_CLASS_BASE from TSX: '${CHIP_CLASS_BASE}'`,
    )
  })

  it('JS file declares CHIP_CLASS_SELECTED matching the TSX constant', () => {
    const expected = `const CHIP_CLASS_SELECTED = '${CHIP_CLASS_SELECTED}'`
    assert.ok(
      jsText.includes(expected),
      `expected JS file to contain:\n  ${expected}\n\nActual CHIP_CLASS_SELECTED from TSX: '${CHIP_CLASS_SELECTED}'`,
    )
  })
})
