/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared tag chip-checkbox component for mutation forms and filter forms.
 * @module components/tag-chip-checkboxes
 */

export const CHIP_CLASS_BASE = 'badge badge-outline cursor-pointer'
export const CHIP_CLASS_SELECTED = 'badge badge-primary cursor-pointer'

interface Tag {
  id: string
  name: string
}

interface TagChipCheckboxesProps {
  tags: Tag[]
  selectedTagIds: Set<string>
  allowNewTags: boolean
  newTagsValue?: string
}

/**
 * Renders a set of tag chip-checkboxes as native server-rendered checkboxes.
 * Chips are sorted alphabetically (case-insensitive).
 * When allowNewTags=true, renders an adjacent newTags text input.
 */
export const TagChipCheckboxes = ({ tags, selectedTagIds, allowNewTags, newTagsValue = '' }: TagChipCheckboxesProps) => {
  const sorted = [...tags].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

  if (sorted.length === 0) {
    if (!allowNewTags) {
      return <></>
    }
    return (
      <div className='flex flex-col gap-2'>
        <p className='text-sm text-base-content/60'>No tags yet.</p>
        <input
          type='text'
          name='newTags'
          className='input input-bordered w-full'
          placeholder='New tag names (comma or space separated)'
          value={newTagsValue}
          aria-label='New tag names'
          data-testid='new-tags-input'
        />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap gap-2' data-testid='tag-chip-checkboxes'>
        {sorted.map((tag) => {
          const isSelected = selectedTagIds.has(tag.id)
          return (
            <label
              key={tag.id}
              className={`label cursor-pointer gap-1 ${isSelected ? CHIP_CLASS_SELECTED : CHIP_CLASS_BASE}`}
              data-testid={`tag-chip-${tag.name}`}
            >
              <input
                type='checkbox'
                name='tagId'
                value={tag.id}
                checked={isSelected}
                className='checkbox checkbox-sm'
                aria-label={tag.name}
              />
              <span className='label-text'>{tag.name}</span>
            </label>
          )
        })}
      </div>
      {allowNewTags && (
        <input
          type='text'
          name='newTags'
          className='input input-bordered w-full'
          placeholder='New tag names (comma or space separated)'
          value={newTagsValue}
          aria-label='New tag names'
          data-testid='new-tags-input'
        />
      )}
    </div>
  )
}
