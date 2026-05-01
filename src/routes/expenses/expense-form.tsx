/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared renderer for the expense entry / edit form.
 *
 * Both the create flow (`POST /expenses`) and the edit flow
 * (`POST /expenses/:id/edit`) use the same field shape, sticky `value`
 * bindings, and per-field error blocks; this module is the single source
 * of truth for that JSX.
 *
 * @module routes/expenses/expense-form
 */
import {
  categoryNameMax,
  descriptionMax,
  tagNameMax,
  type FieldErrors,
} from '../../lib/expense-validators'
import type { ExpenseFormValues } from '../../lib/form-state'

// Generous CSV maxlength: enough for ~8 max-length tags plus separators.
const tagsCsvMax = (tagNameMax + 2) * 8

export type ExpenseFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

export type ExpenseFormPayloads = {
  categories: { name: string }[]
  tags: { name: string }[]
}

export type ExpenseFormMode = 'create' | 'edit'

export type RenderExpenseFormProps = {
  mode: ExpenseFormMode
  action: string
  state: ExpenseFormState
  payloads: ExpenseFormPayloads
}

const fieldError = (field: keyof FieldErrors, message?: string) => {
  if (!message) {
    return null
  }
  return (
    <p
      className='text-error text-sm mt-1'
      data-testid={`expense-form-${field}-error`}
    >
      {message}
    </p>
  )
}

const inputClass = (base: string, hasError: boolean) =>
  hasError ? `${base} input-error` : base

// Serialize a JSON payload safely for embedding inside a <script> tag.
// Escaping `<` (and `>` / `&` defensively) prevents a stray `</script>`
// in any data field from breaking out of the script element.
const safeJsonForScript = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

export const renderExpenseForm = (props: RenderExpenseFormProps) => {
  const { mode, action, state, payloads } = props
  const { fieldErrors, values } = state
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Add expense'
  const submitTestId =
    mode === 'edit' ? 'expense-form-save' : 'expense-form-create'
  return (
    <form
      method='post'
      action={action}
      className='mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-start'
      data-testid='expense-form'
      noValidate
    >
      <div className='flex flex-col md:col-span-2'>
        <label className='label' htmlFor='expense-form-description'>
          <span className='label-text'>Description</span>
        </label>
        <input
          id='expense-form-description'
          name='description'
          type='text'
          required
          maxLength={descriptionMax + 50}
          className={inputClass('input input-bordered w-full', !!fieldErrors.description)}
          data-testid='expense-form-description'
          value={values.description ?? ''}
        />
        {fieldError('description', fieldErrors.description)}
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-amount'>
          <span className='label-text'>Amount</span>
        </label>
        <input
          id='expense-form-amount'
          name='amount'
          type='text'
          inputMode='decimal'
          required
          className={inputClass('input input-bordered', !!fieldErrors.amount)}
          data-testid='expense-form-amount'
          value={values.amount ?? ''}
        />
        {fieldError('amount', fieldErrors.amount)}
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-date'>
          <span className='label-text'>Date</span>
        </label>
        <input
          id='expense-form-date'
          name='date'
          type='text'
          required
          pattern='\d{4}-\d{2}-\d{2}'
          className={inputClass('input input-bordered', !!fieldErrors.date)}
          data-testid='expense-form-date'
          value={values.date ?? ''}
          placeholder='YYYY-MM-DD'
        />
        {fieldError('date', fieldErrors.date)}
      </div>
      <div className='flex flex-col'>
        <label className='label' htmlFor='expense-form-category'>
          <span className='label-text'>Category</span>
        </label>
        <input
          id='expense-form-category'
          name='category'
          type='text'
          required
          maxLength={categoryNameMax + 50}
          className={inputClass('input input-bordered', !!fieldErrors.category)}
          data-testid='expense-form-category'
          data-category-combobox
          value={values.category ?? ''}
          placeholder='Type a category'
        />
        {fieldError('category', fieldErrors.category)}
      </div>
      <div className='flex flex-col md:col-span-4'>
        <label className='label' htmlFor='expense-form-tags'>
          <span className='label-text'>Tags (comma-separated)</span>
        </label>
        <input
          id='expense-form-tags'
          name='tags'
          type='text'
          maxLength={tagsCsvMax}
          className={inputClass('input input-bordered w-full', !!fieldErrors.tags)}
          data-testid='expense-form-tags'
          data-tag-chip-picker
          value={values.tags ?? ''}
          placeholder='e.g. food, groceries'
        />
        {fieldError('tags', fieldErrors.tags)}
      </div>
      <div className='self-end justify-self-end'>
        <button
          type='submit'
          className='btn btn-primary'
          data-testid={submitTestId}
        >
          {submitLabel}
        </button>
      </div>
      <script
        type='application/json'
        data-testid='categories-data'
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.categories) }}
      />
      <script
        type='application/json'
        data-testid='tags-data'
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.tags) }}
      />
    </form>
  )
}

// ---------- Confirm-create-new-items page (shared between create + edit) ----------

export type ConfirmNewItemsProps = {
  mode: ExpenseFormMode
  // POST target for the confirm/cancel form.
  action: string
  // Normalized (lowercased, trimmed) new category name, or null when the
  // category already exists.
  newCategoryName: string | null
  // Final category name to display in the preview (existing match name or
  // the normalized new-category name).
  finalCategoryName: string
  // Normalized new-tag names (lowercased, trimmed, de-duplicated). Already
  // alphabetized by the caller.
  newTagNames: string[]
  // Final tag list to display in the preview (alphabetized).
  finalTagNames: string[]
  // Raw values from the entry / edit form (exact strings to round-trip on
  // Cancel).
  values: ExpenseFormValues
}

const formatAmountDisplay = (value: string | undefined): string =>
  (value ?? '').trim()

export const renderConfirmNewItems = (props: ConfirmNewItemsProps) => {
  const {
    mode,
    action,
    newCategoryName,
    finalCategoryName,
    newTagNames,
    finalTagNames,
    values,
  } = props
  const prefix = mode === 'edit' ? 'confirm-edit-new' : 'confirm-create-new'
  return (
    <div className='max-w-xl mx-auto' data-testid={`${prefix}-page`}>
      <h1 className='text-2xl font-bold mb-4'>Confirm new items</h1>
      <ul className='mb-4 list-disc list-inside' data-testid={`${prefix}-list`}>
        {newCategoryName !== null ? (
          <li data-testid={`${prefix}-category-line`}>
            Create category <strong>'{newCategoryName}'</strong>
          </li>
        ) : null}
        {newTagNames.map((name) => (
          <li data-testid={`${prefix}-tag-line`}>
            Create tag <strong>'{name}'</strong>
          </li>
        ))}
      </ul>
      <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mb-6'>
        <dt className='font-semibold'>Description</dt>
        <dd data-testid={`${prefix}-description`}>{values.description ?? ''}</dd>
        <dt className='font-semibold'>Amount</dt>
        <dd data-testid={`${prefix}-amount`}>{formatAmountDisplay(values.amount)}</dd>
        <dt className='font-semibold'>Date</dt>
        <dd data-testid={`${prefix}-date`}>{values.date ?? ''}</dd>
        <dt className='font-semibold'>Category</dt>
        <dd data-testid={`${prefix}-category`}>{finalCategoryName}</dd>
        <dt className='font-semibold'>Tags</dt>
        <dd data-testid={`${prefix}-tags`}>{finalTagNames.join(', ')}</dd>
      </dl>
      <form
        method='post'
        action={action}
        className='flex gap-3'
        data-testid={`${prefix}-form`}
        noValidate
      >
        <input type='hidden' name='description' value={values.description ?? ''} />
        <input type='hidden' name='amount' value={values.amount ?? ''} />
        <input type='hidden' name='date' value={values.date ?? ''} />
        <input type='hidden' name='category' value={values.category ?? ''} />
        <input type='hidden' name='tags' value={values.tags ?? ''} />
        <button
          type='submit'
          name='action'
          value='confirm'
          className='btn btn-primary'
          data-testid={`${prefix}-confirm`}
        >
          Confirm
        </button>
        <button
          type='submit'
          name='action'
          value='cancel'
          className='btn btn-ghost'
          data-testid={`${prefix}-cancel`}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
