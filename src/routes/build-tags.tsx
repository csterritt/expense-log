/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the tags management page.
 * @module routes/buildTags
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'
import { createDbClient } from '../db/client'
import {
  countTagExpenses,
  createTag,
  deleteTag,
  listTags,
  mergeTag,
  renameTag,
  type TagRow,
} from '../lib/db/tag-access'
import {
  parseTagCreate,
  parseTagDelete,
  parseTagMergeConfirm,
  parseTagRename,
  tagNameMax,
  type FieldErrors,
} from '../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../lib/form-state'
import { redirectWithError, redirectWithMessage } from '../lib/redirects'

const TAG_MERGE_CONFIRM_PATH = '/tags/merge-confirm'
const tagInputMax = tagNameMax + 50

type TagFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (): TagFormState => ({ fieldErrors: {}, values: {} })

const tagRenamePath = (id: string): string => `/tags/${id}/rename`
const tagDeletePath = (id: string): string => `/tags/${id}/delete`

const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody()
  return {
    name: typeof form.name === 'string' ? form.name : '',
    id: typeof form.id === 'string' ? form.id : '',
    sourceId: typeof form.sourceId === 'string' ? form.sourceId : '',
    targetId: typeof form.targetId === 'string' ? form.targetId : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}

const renderFieldError = (id: string, message: string | undefined) => {
  if (!message) {
    return null
  }
  return (
    <p id={id} className='text-error text-sm mt-1' data-testid={id}>
      {message}
    </p>
  )
}

const renderTags = (rows: TagRow[], state: TagFormState) => {
  const createName = state.values.id ? '' : (state.values.name ?? '')
  const createError = state.values.id ? undefined : state.fieldErrors.name
  return (
    <div data-testid='tags-page' className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Tags</h1>
        <a href={PATHS.EXPENSES} className='btn btn-ghost' data-testid='back-to-expenses-action'>
          Back to expenses
        </a>
      </div>

      <section className='card bg-base-100 shadow'>
        <div className='card-body'>
          <h2 className='card-title'>Create tag</h2>
          <form method='post' action={PATHS.TAGS} className='flex flex-col gap-3' noValidate>
            <label className='flex flex-col gap-1'>
              <span className='label-text'>Name</span>
              <input
                name='name'
                type='text'
                className={`input input-bordered ${createError ? 'input-error' : ''}`}
                value={createName}
                required
                maxLength={tagInputMax}
                aria-describedby={createError ? 'tag-create-name-error' : undefined}
                data-testid='tag-create-name'
              />
              {renderFieldError('tag-create-name-error', createError)}
            </label>
            <div>
              <button type='submit' className='btn btn-primary' data-testid='create-tag-action'>
                Create tag
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className='card bg-base-100 shadow'>
        <div className='card-body'>
          <h2 className='card-title'>Manage tags</h2>
          {rows.length === 0 ? (
            <p className='text-gray-600' data-testid='tags-empty-state'>
              No tags yet
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='table table-zebra w-full' data-testid='tags-table'>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Rename</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const renameError =
                      state.values.id === row.id ? state.fieldErrors.name : undefined
                    const renameValue =
                      state.values.id === row.id ? (state.values.name ?? '') : row.name
                    return (
                      <tr data-testid='tag-row' data-tag-id={row.id}>
                        <td data-testid='tag-row-name'>{row.name}</td>
                        <td>
                          <form
                            method='post'
                            action={tagRenamePath(row.id)}
                            className='flex flex-col gap-2 md:flex-row md:items-start'
                            noValidate
                          >
                            <label className='flex flex-col gap-1'>
                              <span className='sr-only'>Rename {row.name}</span>
                              <input
                                name='name'
                                type='text'
                                className={`input input-bordered input-sm ${
                                  renameError ? 'input-error' : ''
                                }`}
                                value={renameValue}
                                required
                                maxLength={tagInputMax}
                                aria-describedby={
                                  renameError ? `tag-${row.id}-rename-error` : undefined
                                }
                                data-testid='tag-rename-name'
                              />
                              {renderFieldError(`tag-${row.id}-rename-error`, renameError)}
                            </label>
                            <button
                              type='submit'
                              className='btn btn-sm'
                              data-testid='rename-tag-action'
                            >
                              Rename
                            </button>
                          </form>
                        </td>
                        <td className='text-right'>
                          <form method='post' action={tagDeletePath(row.id)} noValidate>
                            <button
                              type='submit'
                              className='btn btn-sm btn-error btn-outline'
                              data-testid='delete-tag-action'
                            >
                              Delete
                            </button>
                          </form>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

const renderMergeConfirm = (props: {
  source: TagRow
  target: TagRow
  expenseCount: number
}) => {
  const { source, target, expenseCount } = props
  return (
    <div className='max-w-xl mx-auto space-y-4' data-testid='tag-merge-confirm-page'>
      <h1 className='text-2xl font-bold'>Merge tags?</h1>
      <p>
        Rename target already exists. Merge{' '}
        <strong data-testid='merge-source-name'>{source.name}</strong> into{' '}
        <strong data-testid='merge-target-name'>{target.name}</strong>?
      </p>
      <p data-testid='merge-expense-count'>All {expenseCount} expenses will be reassigned.</p>
      <form
        method='post'
        action={TAG_MERGE_CONFIRM_PATH}
        className='flex gap-3'
        data-testid='tag-merge-confirm-form'
        noValidate
      >
        <input type='hidden' name='sourceId' value={source.id} />
        <input type='hidden' name='targetId' value={target.id} />
        <button
          type='submit'
          className='btn btn-primary'
          data-testid='confirm-merge-tag-action'
        >
          Merge tags
        </button>
        <button
          type='submit'
          name='action'
          value='cancel'
          className='btn btn-ghost'
          data-testid='cancel-merge-tag-action'
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

const findTagById = (rows: TagRow[], id: string): TagRow | undefined =>
  rows.find((row) => row.id === id)

const findTagByName = (rows: TagRow[], name: string): TagRow | undefined =>
  rows.find((row) => row.name.toLowerCase() === name.toLowerCase())

export const buildTags = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.TAGS,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await listTags(db)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load tags. Please try again.')
      }
      const flash = readAndClearFormState(c)
      const state: TagFormState = flash
        ? { fieldErrors: flash.fieldErrors ?? {}, values: flash.values ?? {} }
        : emptyState()
      return c.render(useLayout(c, renderTags(result.value, state)))
    },
  )

  app.post(
    PATHS.TAGS,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      const validated = parseTagCreate({ name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.TAGS, validated.error, { name: raw.name })
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await createTag(db, validated.value.name)
      if (result.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.TAGS,
          { name: result.error.message },
          { name: raw.name },
        )
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tag created.')
    },
  )

  app.post(
    '/tags/:id/rename',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const raw = await readRawBody(c)
      const values: ExpenseFormValues = { id, name: raw.name }
      const validated = parseTagRename({ id, name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.TAGS, validated.error, values)
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Failed to rename tag. Please try again.')
      }
      const source = findTagById(tagsResult.value, validated.value.id)
      if (!source) {
        return redirectWithError(c, PATHS.TAGS, 'Tag not found.')
      }
      const existingTarget = findTagByName(tagsResult.value, validated.value.name)
      if (existingTarget !== undefined && existingTarget.id !== validated.value.id) {
        const expenseCount = await countTagExpenses(db, validated.value.id)
        if (expenseCount.isErr) {
          return redirectWithError(c, PATHS.TAGS, 'Failed to rename tag. Please try again.')
        }
        return c.render(
          useLayout(
            c,
            renderMergeConfirm({
              source,
              target: existingTarget,
              expenseCount: expenseCount.value,
            }),
          ),
        )
      }
      const result = await renameTag(db, validated.value)
      if (result.isErr) {
        return redirectWithFormErrors(c, PATHS.TAGS, { name: result.error.message }, values)
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tag renamed.')
    },
  )

  app.post(
    TAG_MERGE_CONFIRM_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      if (raw.action === 'cancel') {
        return redirectWithMessage(c, PATHS.TAGS, 'Tag merge canceled.')
      }
      const validated = parseTagMergeConfirm({
        sourceId: raw.sourceId,
        targetId: raw.targetId,
      })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Invalid merge request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Failed to merge tags. Please try again.')
      }
      const source = findTagById(tagsResult.value, validated.value.sourceId)
      const target = findTagById(tagsResult.value, validated.value.targetId)
      if (!source || !target) {
        return redirectWithError(c, PATHS.TAGS, 'Tag not found.')
      }
      const result = await mergeTag(db, validated.value)
      if (result.isErr) {
        return redirectWithError(c, PATHS.TAGS, result.error.message)
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tags merged.')
    },
  )

  app.post(
    '/tags/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const validated = parseTagDelete({ id })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Invalid delete request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await deleteTag(db, validated.value.id)
      if (result.isErr) {
        return redirectWithError(c, PATHS.TAGS, result.error.message)
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tag deleted.')
    },
  )
}
