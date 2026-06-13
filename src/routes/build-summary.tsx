/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expense summary page.
 * @module routes/build-summary
 */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'
import { createDbClient } from '../db/client'
import { redirectWithError } from '../lib/redirects'
import { defaultRangeEt } from '../lib/et-date'
import { parseSummaryQuery } from '../lib/expense-validators'
import type { SummaryQueryResult } from '../lib/expense-validators'
import { summarize } from '../lib/db/summary-access'
import type { SummaryRow } from '../lib/db/summary-access'
import { listTags } from '../lib/db/tag-access'
import type { TagRow } from '../lib/db/tag-access'
import { formatCents } from '../lib/money'
import { TagChipCheckboxes } from '../components/tag-chip-checkboxes'

// ---------- helpers ----------

/** Serialize the parsed summary query state into a URL, optionally toggling sort for `column`. */
const summaryUrl = (current: SummaryQueryResult, overrideSort?: string): string => {
  const params = new URLSearchParams()
  if (current.dimension !== 'category') params.set('dimension', current.dimension)
  if (current.granularity !== 'month') params.set('granularity', current.granularity)
  if (current.from) params.set('from', current.from)
  if (current.to) params.set('to', current.to)
  for (const id of current.tagIds) params.append('tagId', id)

  if (overrideSort) {
    const existing = current.sort.find((s) => s.column === overrideSort)
    const direction = existing?.direction === 'desc' ? 'asc' : 'desc'
    params.set('sort', `${overrideSort}:${direction}`)
  }

  const qs = params.toString()
  return `${PATHS.SUMMARY}${qs ? `?${qs}` : ''}`
}

const SORT_INDICATOR: Record<'asc' | 'desc', string> = { asc: ' ▲', desc: ' ▼' }

// ---------- sub-components ----------

const SortLink = ({
  parsed,
  column,
  label,
}: {
  parsed: SummaryQueryResult
  column: string
  label: string
}) => {
  const dir = parsed.sort.find((s) => s.column === column)?.direction
  return (
    <a href={summaryUrl(parsed, column)} data-testid={`summary-sort-${column}`}>
      {label}
      {dir ? SORT_INDICATOR[dir] : ''}
    </a>
  )
}

const ControlsForm = ({
  parsed,
  tags,
}: {
  parsed: SummaryQueryResult
  tags: TagRow[]
}) => {
  const tagIdSet = new Set(tags.map((t) => t.id))
  const activeTagSet = new Set(parsed.tagIds.filter((id) => tagIdSet.has(id)))
  return (
    <form method='get' action={PATHS.SUMMARY} className='mb-6'>
      <div className='card bg-base-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='form-control'>
            <label className='label' for='summary-dimension'>
              <span className='label-text'>Group by</span>
            </label>
            <select
              id='summary-dimension'
              name='dimension'
              className='select select-bordered'
              data-testid='summary-dimension'
            >
              <option value='time' selected={parsed.dimension === 'time'}>
                Time only
              </option>
              <option value='category' selected={parsed.dimension === 'category'}>
                Category
              </option>
              <option value='tag' selected={parsed.dimension === 'tag'}>
                Tag
              </option>
              <option value='category-tag' selected={parsed.dimension === 'category-tag'}>
                Category + Tag
              </option>
            </select>
          </div>

          <div className='form-control'>
            <label className='label' for='summary-granularity'>
              <span className='label-text'>Period</span>
            </label>
            <select
              id='summary-granularity'
              name='granularity'
              className='select select-bordered'
              data-testid='summary-granularity'
            >
              <option value='month' selected={parsed.granularity === 'month'}>
                Month
              </option>
              <option value='quarter' selected={parsed.granularity === 'quarter'}>
                Quarter
              </option>
              <option value='year' selected={parsed.granularity === 'year'}>
                Year
              </option>
            </select>
          </div>

          <div className='form-control'>
            <label className='label' for='summary-from'>
              <span className='label-text'>From</span>
            </label>
            <input
              id='summary-from'
              type='date'
              name='from'
              className='input input-bordered'
              value={parsed.from ?? ''}
              data-testid='summary-from'
            />
          </div>

          <div className='form-control'>
            <label className='label' for='summary-to'>
              <span className='label-text'>To</span>
            </label>
            <input
              id='summary-to'
              type='date'
              name='to'
              className='input input-bordered'
              value={parsed.to ?? ''}
              data-testid='summary-to'
            />
            {parsed.fieldErrors.date && (
              <label className='label'>
                <span className='label-text-alt text-error'>{parsed.fieldErrors.date}</span>
              </label>
            )}
          </div>
        </div>

        {tags.length > 0 && (
          <div className='form-control mt-4'>
            <label className='label' for='summary-tag-filter'>
              <span className='label-text'>Tag filter (AND — all selected must match)</span>
            </label>
            <TagChipCheckboxes
              tags={tags}
              selectedTagIds={activeTagSet}
              allowNewTags={false}
            />
          </div>
        )}

        {parsed.fieldErrors.groupBy && (
          <p className='text-error text-sm mt-2'>{parsed.fieldErrors.groupBy}</p>
        )}

        <div className='mt-4 flex gap-2'>
          <button type='submit' className='btn btn-primary btn-sm' data-testid='summary-submit'>
            Apply
          </button>
          <a href={PATHS.SUMMARY} className='btn btn-ghost btn-sm' data-testid='summary-clear'>
            Clear
          </a>
        </div>
      </div>
    </form>
  )
}

const ResultsTable = ({
  rows,
  parsed,
}: {
  rows: SummaryRow[]
  parsed: SummaryQueryResult
}) => {
  const { dimension } = parsed
  const showCategory = dimension === 'category' || dimension === 'category-tag'
  const showTag = dimension === 'tag' || dimension === 'category-tag'

  if (rows.length === 0) {
    return (
      <p className='text-gray-600' data-testid='summary-empty'>
        No expenses match the selected filters.
      </p>
    )
  }

  return (
    <div className='overflow-x-auto'>
      {showTag && (
        <p className='text-sm text-gray-500 mb-2' data-testid='summary-tag-note'>
          Multi-tagged expenses count fully under each tag; row totals therefore stand alone and do
          not sum to a meaningful grand total.
        </p>
      )}
      <table className='table table-zebra w-full'>
        <thead>
          <tr>
            {showCategory && (
              <th>
                <SortLink parsed={parsed} column='category' label='Category' />
              </th>
            )}
            {showTag && (
              <th>
                <SortLink parsed={parsed} column='tag' label='Tag' />
              </th>
            )}
            <th>
              <SortLink parsed={parsed} column='timePeriod' label='Period' />
            </th>
            <th>
              <SortLink parsed={parsed} column='count' label='Count' />
            </th>
            <th className='text-right'>
              <SortLink parsed={parsed} column='total' label='Total' />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr data-testid='summary-row' key={i}>
              {showCategory && (
                <td data-testid='summary-row-category'>{row.categoryName ?? ''}</td>
              )}
              {showTag && <td data-testid='summary-row-tag'>{row.tagName ?? ''}</td>}
              <td data-testid='summary-row-time-period'>{row.timePeriod}</td>
              <td data-testid='summary-row-count'>{row.count}</td>
              <td className='text-right' data-testid='summary-row-total'>
                {formatCents(row.totalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- route ----------

export const buildSummary = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.SUMMARY,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c) => {
      const db = createDbClient(c.env.PROJECT_DB)

      const rawQ = c.req.query()
      const rawTagId = c.req.queries('tagId')
      const rawSort = c.req.queries('sort')
      const raw = {
        dimension: rawQ['dimension'],
        granularity: rawQ['granularity'],
        from: rawQ['from'],
        to: rawQ['to'],
        tagId: rawTagId !== undefined && rawTagId.length > 0 ? rawTagId : rawQ['tagId'],
        sort: rawSort !== undefined && rawSort.length > 0 ? rawSort : rawQ['sort'],
      }

      const parsed = parseSummaryQuery(raw)

      const defaultRange = parsed.hasFilterParams ? null : defaultRangeEt()
      const activeFilters = defaultRange
        ? { from: defaultRange.from, to: defaultRange.to, tagIds: [] as string[] }
        : { from: parsed.from, to: parsed.to, tagIds: parsed.tagIds }

      if (defaultRange) {
        parsed.from = defaultRange.from
        parsed.to = defaultRange.to
      }

      const [summaryResult, tagsResult] = await Promise.all([
        summarize(db, {
          dimension: parsed.dimension,
          granularity: parsed.granularity,
          filters: activeFilters,
          sort: parsed.sort,
        }),
        listTags(db),
      ])

      if (summaryResult.isErr) {
        return redirectWithError(c, PATHS.AUTH.SIGN_IN, 'Failed to load summary. Please try again.')
      }
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.AUTH.SIGN_IN, 'Failed to load tags. Please try again.')
      }

      return c.render(
        useLayout(
          c,
          <div data-testid='summary-page'>
            <h1 className='text-2xl font-bold mb-4'>Summary</h1>
            <ControlsForm parsed={parsed} tags={tagsResult.value} />
            <ResultsTable rows={summaryResult.value} parsed={parsed} />
          </div>,
        ),
      )
    },
  )
}
