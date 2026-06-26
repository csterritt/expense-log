/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Render functions for the expenses list page.
 * @module routes/expenses/expense-list-renderer
 */

import { PATHS } from '../../constants'
import type { CategoryRow } from '../../lib/db/category-access'
import type { TagRow } from '../../lib/db/tag-access'
import type { ExpenseRow } from '../../lib/db/expense-access'
import { formatCents } from '../../lib/money'
import type { FieldErrors, ParsedExpenseListFilters } from '../../lib/expense-validators'
import { TagChipCheckboxes } from '../../components/tag-chip-checkboxes'
import {
  renderExpenseForm,
  type ExpenseFormPayloads,
  type ExpenseFormState,
} from './expense-form'

/**
 * Renders the filter bar for the expenses list.
 *
 * @param categories - All available categories
 * @param tags - All available tags
 * @param activeFilters - Currently active filter values
 * @param filterErrors - Validation errors for filter inputs
 * @returns The filter bar JSX element
 */
export const renderFilterBar = (
  categories: CategoryRow[],
  tags: TagRow[],
  activeFilters: ParsedExpenseListFilters,
  filterErrors: FieldErrors,
) => {
  const activeCategoryId = activeFilters.categoryId ?? ''
  const activeTagMode = activeFilters.tagMode ?? 'or'
  const activeTagIds = new Set(activeFilters.tagIds ?? [])
  const hasAnyFilter =
    (activeFilters.description && activeFilters.description.length > 0) ||
    activeFilters.from ||
    activeFilters.to ||
    activeCategoryId.length > 0 ||
    activeTagIds.size > 0

  return (
    <form method='get' action={PATHS.EXPENSES} className='mb-6' data-testid='expense-filter-bar'>
      <div className='card bg-base-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='form-control'>
            <label className='label' for='filter-description'>
              <span className='label-text'>Description</span>
            </label>
            <input
              id='filter-description'
              type='text'
              name='description'
              className='input input-bordered'
              placeholder='Search...'
              value={activeFilters.description ?? ''}
              data-testid='filter-description'
            />
          </div>

          <div className='form-control'>
            <label className='label' for='filter-from'>
              <span className='label-text'>From</span>
            </label>
            <input
              id='filter-from'
              type='date'
              name='from'
              className={`input input-bordered${filterErrors.date ? ' input-error' : ''}`}
              value={activeFilters.from ?? ''}
              data-testid='filter-from'
            />
          </div>

          <div className='form-control'>
            <label className='label' for='filter-to'>
              <span className='label-text'>To</span>
            </label>
            <input
              id='filter-to'
              type='date'
              name='to'
              className={`input input-bordered${filterErrors.date ? ' input-error' : ''}`}
              value={activeFilters.to ?? ''}
              data-testid='filter-to'
            />
            {filterErrors.date && (
              <label className='label'>
                <span className='label-text-alt text-error' data-testid='filter-date-error'>
                  {filterErrors.date}
                </span>
              </label>
            )}
          </div>

          <div className='form-control'>
            <label className='label' for='filter-category'>
              <span className='label-text'>Category</span>
            </label>
            <select
              id='filter-category'
              name='categoryId'
              className='select select-bordered'
              data-testid='filter-category'
            >
              <option value=''>All categories</option>
              {categories.map((cat) => (
                <option value={cat.id} selected={cat.id === activeCategoryId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div className='mt-4'>
            <div className='label'>
              <span className='label-text font-semibold'>Tags</span>
              <span className='label-text-alt'>
                <label className='label cursor-pointer gap-2'>
                  <span>Any</span>
                  <input
                    type='radio'
                    name='tagMode'
                    value='or'
                    className='radio radio-sm'
                    checked={activeTagMode === 'or'}
                    data-testid='filter-tag-mode-or'
                  />
                  <input
                    type='radio'
                    name='tagMode'
                    value='and'
                    className='radio radio-sm'
                    checked={activeTagMode === 'and'}
                    data-testid='filter-tag-mode-and'
                  />
                  <span>All</span>
                </label>
              </span>
            </div>
            <TagChipCheckboxes
              tags={tags}
              selectedTagIds={activeTagIds}
              allowNewTags={false}
            />
            {filterErrors.tags && (
              <p className='text-error text-sm mt-1' data-testid='filter-tags-error'>
                {filterErrors.tags}
              </p>
            )}
          </div>
        )}

        <div className='mt-4 flex gap-2'>
          <button
            type='submit'
            className='btn btn-primary btn-sm'
            data-testid='filter-submit'
          >
            Filter
          </button>
          {hasAnyFilter && (
            <a
              href={PATHS.EXPENSES}
              className='btn btn-ghost btn-sm'
              data-testid='filter-clear'
            >
              Clear filters
            </a>
          )}
        </div>
      </div>
    </form>
  )
}

/**
 * Renders the expenses table.
 *
 * @param rows - Expense rows to display
 * @returns The expense table JSX element
 */
export const renderExpenseTable = (rows: ExpenseRow[]) => {
  return (
    <div className='overflow-x-auto'>
      <table className='table table-zebra w-full' data-testid='expenses-table'>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Tags</th>
            <th className='text-right'>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr data-testid='expense-row' data-expense-id={row.id}>
              <td data-testid='expense-row-date'>{row.date}</td>
              <td data-testid='expense-row-description'>
                {row.recurringId ? (
                  <span>
                    <span className='underline'>{row.description}</span>
                    <span
                      className='ml-1 badge badge-sm badge-soft badge-primary'
                      aria-label='Recurring'
                      title='Recurring'
                      data-testid='expense-row-recurring-badge'
                    >
                      ↻
                    </span>
                  </span>
                ) : (
                  row.description
                )}
              </td>
              <td data-testid='expense-row-category'>{row.categoryName}</td>
              <td data-testid='expense-row-tags'>{row.tagNames.join(', ')}</td>
              <td className='text-right' data-testid='expense-row-amount'>
                {formatCents(row.amountCents)}
              </td>
              <td>
                <a
                  href={`/expenses/${row.id}/edit`}
                  className='btn btn-sm'
                  data-testid='expense-row-edit'
                >
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Renders the complete expenses page.
 *
 * @param rows - Expense rows to display
 * @param state - Form state for the expense entry form
 * @param payloads - Available categories and tags for the form
 * @param allCategories - All available categories for filters
 * @param allTags - All available tags for filters
 * @param activeFilters - Currently active filter values
 * @param filterErrors - Validation errors for filter inputs
 * @returns The expenses page JSX element
 */
export const renderExpenses = (
  rows: ExpenseRow[],
  state: ExpenseFormState,
  payloads: ExpenseFormPayloads,
  allCategories: CategoryRow[],
  allTags: TagRow[],
  activeFilters: ParsedExpenseListFilters,
  filterErrors: FieldErrors,
) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {renderExpenseForm({
        mode: 'create',
        action: PATHS.EXPENSES,
        state,
        payloads,
      })}
      {renderFilterBar(allCategories, allTags, activeFilters, filterErrors)}
      {rows.length === 0 ? (
        <p className='text-gray-600' data-testid='expenses-empty-state'>
          No expenses yet
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
      <script src='/js/category-combobox.js' defer></script>
      <script src='/js/tag-chip-checkboxes.js' defer></script>
    </div>
  )
}
