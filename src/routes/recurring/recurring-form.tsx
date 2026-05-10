/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared renderer for the recurring-template entry / edit form.
 *
 * Both the create flow (`POST /recurring`) and the edit flow
 * (`POST /recurring/:id/edit`) use the same field shape, sticky `value`
 * bindings, and per-field error blocks.
 *
 * @module routes/recurring/recurring-form
 */
import {
  categoryNameMax,
  descriptionMax,
  tagNameMax,
  VALID_RECURRENCES,
  type FieldErrors,
} from '../../lib/expense-validators'
import type { ExpenseFormValues } from '../../lib/form-state'

const tagsCsvMax = (tagNameMax + 2) * 8

export type RecurringFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

export type RecurringFormPayloads = {
  categories: { name: string }[]
  tags: { name: string }[]
}

export type RecurringFormMode = 'create' | 'edit'

export type RenderRecurringFormProps = {
  mode: RecurringFormMode
  action: string
  state: RecurringFormState
  payloads: RecurringFormPayloads
}

const fieldError = (field: keyof FieldErrors, message?: string) => {
  if (!message) {
    return null
  }
  return (
    <p className='text-error text-sm mt-1' data-testid={`recurring-form-${field}-error`}>
      {message}
    </p>
  )
}

const inputClass = (base: string, hasError: boolean) => (hasError ? `${base} input-error` : base)

const safeJsonForScript = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

export const renderRecurringForm = (props: RenderRecurringFormProps) => {
  const { mode, action, state, payloads } = props
  const { fieldErrors, values } = state
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Add recurring'
  const submitTestId = mode === 'edit' ? 'recurring-form-save' : 'recurring-form-create'
  return (
    <form
      method='post'
      action={action}
      className='mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-start'
      data-testid='recurring-form'
      noValidate
    >
      <div className='flex flex-col md:col-span-2'>
        <label className='label' htmlFor='recurring-form-description'>
          <span className='label-text'>Description</span>
        </label>
        <input
          id='recurring-form-description'
          name='description'
          type='text'
          maxLength={descriptionMax}
          className={inputClass('input input-bordered w-full', !!fieldErrors.description)}
          data-testid='recurring-form-description'
          value={values.description ?? ''}
          placeholder='e.g. Monthly rent'
        />
        {fieldError('description', fieldErrors.description)}
      </div>

      <div className='flex flex-col'>
        <label className='label' htmlFor='recurring-form-amount'>
          <span className='label-text'>Amount</span>
        </label>
        <input
          id='recurring-form-amount'
          name='amount'
          type='text'
          inputMode='decimal'
          className={inputClass('input input-bordered w-full', !!fieldErrors.amount)}
          data-testid='recurring-form-amount'
          value={values.amount ?? ''}
          placeholder='e.g. 1200.00'
        />
        {fieldError('amount', fieldErrors.amount)}
      </div>

      <div className='flex flex-col'>
        <label className='label' htmlFor='recurring-form-category'>
          <span className='label-text'>Category</span>
        </label>
        <input
          id='recurring-form-category'
          name='category'
          type='text'
          maxLength={categoryNameMax}
          className={inputClass('input input-bordered w-full', !!fieldErrors.category)}
          data-testid='recurring-form-category'
          data-category-combobox
          value={values.category ?? ''}
          placeholder='e.g. Housing'
        />
        {fieldError('category', fieldErrors.category)}
      </div>

      <div className='flex flex-col'>
        <label className='label' htmlFor='recurring-form-recurrence'>
          <span className='label-text'>Recurrence</span>
        </label>
        <select
          id='recurring-form-recurrence'
          name='recurrence'
          className={inputClass('select select-bordered w-full', !!fieldErrors.recurrence)}
          data-testid='recurring-form-recurrence'
          value={values.recurrence ?? ''}
        >
          <option value=''>-- select --</option>
          {VALID_RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {fieldError('recurrence', fieldErrors.recurrence)}
      </div>

      <div className='flex flex-col'>
        <label className='label' htmlFor='recurring-form-anchor-date'>
          <span className='label-text'>Anchor date</span>
        </label>
        <input
          id='recurring-form-anchor-date'
          name='anchorDate'
          type='date'
          className={inputClass('input input-bordered w-full', !!fieldErrors.anchorDate)}
          data-testid='recurring-form-anchor-date'
          value={values.anchorDate ?? ''}
        />
        {fieldError('anchorDate', fieldErrors.anchorDate)}
      </div>

      <div className='flex flex-col md:col-span-5'>
        <label className='label' htmlFor='recurring-form-tags'>
          <span className='label-text'>Tags</span>
        </label>
        <input
          id='recurring-form-tags'
          name='tags'
          type='text'
          maxLength={tagsCsvMax}
          className={inputClass('input input-bordered w-full', !!fieldErrors.tags)}
          data-testid='recurring-form-tags'
          data-tag-chip-picker
          value={values.tags ?? ''}
          placeholder='e.g. rent, housing'
        />
        {fieldError('tags', fieldErrors.tags)}
      </div>

      <div className='md:col-span-5 self-end'>
        <button type='submit' className='btn btn-primary' data-testid={submitTestId}>
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
