/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { createDbClient } from '../db/client'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'
import {
  summarize,
  listCategories,
  listTags,
  type SummaryRow,
  type CategoryRow,
  type TagRow,
} from '../lib/db/expense-access'
import { formatCents } from '../lib/money'
import {
  parseSummaryQuery,
  type ParsedSummaryQuery,
  type FieldErrors,
} from '../lib/expense-validators'

const FilterBar = ({
  categories,
  tags,
  active,
  errors,
}: {
  categories: CategoryRow[]
  tags: TagRow[]
  active: ParsedSummaryQuery
  errors: FieldErrors
}) => {
  const activeTagIds = new Set(active.tagIds ?? [])
  return (
    <form method='get' action={PATHS.SUMMARY} className='mb-6' data-testid='summary-filter-bar'>
      <div className='card bg-base-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Group-by */}
          <div className='form-control'>
            <label className='label' for='summary-group-by'>
              <span className='label-text'>Group by</span>
            </label>
            <select
              id='summary-group-by'
              name='groupBy'
              className='select select-bordered'
              data-testid='summary-group-by'
            >
              <option value='month' selected={active.groupBy === 'month'}>
                Month
              </option>
              <option value='year' selected={active.groupBy === 'year'}>
                Year
              </option>
            </select>
            {errors.groupBy && (
              <label className='label'>
                <span className='label-text-alt text-error' data-testid='summary-group-by-error'>
                  {errors.groupBy}
                </span>
              </label>
            )}
          </div>

          {/* From */}
          <div className='form-control'>
            <label className='label' for='summary-from'>
              <span className='label-text'>From</span>
            </label>
            <input
              id='summary-from'
              type='date'
              name='from'
              className={`input input-bordered${errors.date ? ' input-error' : ''}`}
              value={active.from}
              data-testid='summary-from'
            />
          </div>

          {/* To */}
          <div className='form-control'>
            <label className='label' for='summary-to'>
              <span className='label-text'>To</span>
            </label>
            <input
              id='summary-to'
              type='date'
              name='to'
              className={`input input-bordered${errors.date ? ' input-error' : ''}`}
              value={active.to}
              data-testid='summary-to'
            />
          </div>

          {/* Category */}
          <div className='form-control'>
            <label className='label' for='summary-category'>
              <span className='label-text'>Category</span>
            </label>
            <select
              id='summary-category'
              name='categoryId'
              className='select select-bordered'
              data-testid='summary-category'
            >
              <option value='' selected={!active.categoryId}>
                All
              </option>
              {categories.map((c) => (
                <option value={c.id} selected={c.id === active.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className='mt-4'>
            <div className='flex flex-wrap gap-2 mb-2'>
              {tags.map((t) => (
                <label
                  className={`badge cursor-pointer select-none${activeTagIds.has(t.id) ? ' badge-primary' : ' badge-outline'}`}
                  data-testid={`summary-tag-${t.id}`}
                >
                  <input
                    type='checkbox'
                    name='tagId'
                    value={t.id}
                    checked={activeTagIds.has(t.id)}
                    className='hidden'
                  />
                  {t.name}
                </label>
              ))}
            </div>
            <div className='flex items-center gap-2'>
              <label className='label cursor-pointer gap-2'>
                <input
                  type='radio'
                  name='tagMode'
                  value='or'
                  checked={active.tagMode === 'or'}
                  className='radio radio-xs'
                  data-testid='summary-tag-mode-or'
                />
                <span className='label-text'>Any tag</span>
              </label>
              <label className='label cursor-pointer gap-2'>
                <input
                  type='radio'
                  name='tagMode'
                  value='and'
                  checked={active.tagMode === 'and'}
                  className='radio radio-xs'
                  data-testid='summary-tag-mode-and'
                />
                <span className='label-text'>All tags</span>
              </label>
            </div>
            {errors.tags && (
              <p className='text-error text-sm mt-1' data-testid='summary-tags-error'>
                {errors.tags}
              </p>
            )}
          </div>
        )}

        {/* Date error */}
        {errors.date && (
          <p className='text-error text-sm mt-2' data-testid='summary-date-error'>
            {errors.date}
          </p>
        )}

        {/* Submit */}
        <div className='mt-4'>
          <button type='submit' className='btn btn-primary btn-sm' data-testid='summary-apply-filters'>
            Apply
          </button>
        </div>
      </div>
    </form>
  )
}

const SummaryTable = ({ rows }: { rows: SummaryRow[] }) => {
  if (rows.length === 0) {
    return (
      <div className='text-center py-12 text-gray-500' data-testid='summary-empty'>
        No expenses match the selected filters.
      </div>
    )
  }

  const grandTotal = rows.reduce((sum, r) => sum + r.totalCents, 0)
  const grandCount = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <div data-testid='summary-table'>
      <div className='overflow-x-auto'>
        <table className='table table-zebra w-full'>
          <thead>
            <tr>
              <th data-testid='summary-col-date'>Date</th>
              <th data-testid='summary-col-category'>Category</th>
              <th data-testid='summary-col-tag'>Tag</th>
              <th className='text-right' data-testid='summary-col-total'>Total</th>
              <th className='text-right' data-testid='summary-col-count'>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} data-testid='summary-row'>
                <td data-testid='summary-row-date'>{row.dateKey}</td>
                <td data-testid='summary-row-category'>{row.categoryName}</td>
                <td data-testid='summary-row-tag'>
                  {row.tagName || <span className='italic text-gray-400'>none</span>}
                </td>
                <td className='text-right' data-testid='summary-row-total'>
                  {formatCents(row.totalCents)}
                </td>
                <td className='text-right' data-testid='summary-row-count'>
                  {row.count}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className='font-bold'>
              <td colSpan={3}>Grand total</td>
              <td className='text-right' data-testid='summary-grand-total'>
                {formatCents(grandTotal)}
              </td>
              <td className='text-right' data-testid='summary-grand-count'>
                {grandCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export const buildSummary = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.SUMMARY,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c) => {
      const db = createDbClient(c.env.PROJECT_DB)
      const rawQuery = c.req.query()
      const parsed = parseSummaryQuery(rawQuery)

      if (parsed.isErr) {
        const [cats, tags] = await Promise.all([listCategories(db), listTags(db)])
        const catRows = cats.isOk ? cats.value : []
        const tagRows = tags.isOk ? tags.value : []
        const defaults = parseSummaryQuery({})
        const active = defaults.isOk
          ? defaults.value
          : {
              groupBy: 'month' as const,
              from: '',
              to: '',
              tagIds: [] as string[],
              tagMode: 'or' as const,
            }
        return c.render(
          useLayout(
            c,
            <div data-testid='summary-page'>
              <h1 className='text-2xl font-bold mb-4'>Summary</h1>
              <FilterBar categories={catRows} tags={tagRows} active={active} errors={parsed.error} />
              <SummaryTable rows={[]} />
            </div>,
          ),
        )
      }

      const filters = parsed.value
      const [cats, tags, summary] = await Promise.all([
        listCategories(db),
        listTags(db),
        summarize(db, filters),
      ])
      const catRows = cats.isOk ? cats.value : []
      const tagRows = tags.isOk ? tags.value : []
      const rows = summary.isOk ? summary.value : []

      return c.render(
        useLayout(
          c,
          <div data-testid='summary-page'>
            <h1 className='text-2xl font-bold mb-4'>Summary</h1>
            <FilterBar categories={catRows} tags={tagRows} active={filters} errors={{}} />
            <SummaryTable rows={rows} />
          </div>,
        ),
      )
    },
  )
}
