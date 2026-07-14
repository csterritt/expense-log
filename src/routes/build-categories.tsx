/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the categories placeholder page.
 * @module routes/buildCategories
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'
import { createDbClient } from '../db/client'
import {
  countCategoryExpenses,
  createCategory,
  deleteCategory,
  findCategoryByName,
  listCategories,
  mergeCategory,
  renameCategory,
  type CategoryRow,
} from '../lib/db/category-access'
import {
  parseCategoryCreate,
  parseCategoryDelete,
  parseCategoryMergeConfirm,
  parseCategoryRename,
  categoryNameMax,
  type FieldErrors,
} from '../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../lib/form-state'
import { redirectWithError, redirectWithMessage } from '../lib/redirects'

const CATEGORY_MERGE_CONFIRM_PATH = '/categories/merge-confirm'
const categoryInputMax = categoryNameMax + 50

type CategoryFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (): CategoryFormState => ({ fieldErrors: {}, values: {} })

const categoryRenamePath = (id: string): string => `/categories/${id}/rename`
const categoryDeletePath = (id: string): string => `/categories/${id}/delete`

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

const renderCategories = (rows: CategoryRow[], state: CategoryFormState) => {
  const createName = state.values.id ? '' : (state.values.name ?? '')
  const createError = state.values.id ? undefined : state.fieldErrors.name
  return (
    <div data-testid='categories-page' className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Categories</h1>
        <a href={PATHS.EXPENSES} className='btn btn-ghost' data-testid='back-to-expenses-action'>
          Back to expenses
        </a>
      </div>

      <section className='card bg-base-100 shadow'>
        <div className='card-body'>
          <h2 className='card-title'>Create category</h2>
          <form method='post' action={PATHS.CATEGORIES} className='flex flex-col gap-3' noValidate>
            <label className='flex flex-col gap-1'>
              <span className='label-text'>Name</span>
              <input
                name='name'
                type='text'
                className={`input input-bordered ${createError ? 'input-error' : ''}`}
                value={createName}
                required
                maxLength={categoryInputMax}
                aria-describedby={createError ? 'category-create-name-error' : undefined}
                data-testid='category-create-name'
              />
              {renderFieldError('category-create-name-error', createError)}
            </label>
            <div>
              <button
                type='submit'
                className='btn btn-primary'
                data-testid='create-category-action'
              >
                Create category
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className='card bg-base-100 shadow'>
        <div className='card-body'>
          <h2 className='card-title'>Manage categories</h2>
          {rows.length === 0 ? (
            <p className='text-gray-600' data-testid='categories-empty-state'>
              No categories yet
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='table table-zebra w-full' data-testid='categories-table'>
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
                      <tr data-testid='category-row' data-category-id={row.id}>
                        <td data-testid='category-row-name'>{row.name}</td>
                        <td>
                          <form
                            method='post'
                            action={categoryRenamePath(row.id)}
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
                                maxLength={categoryInputMax}
                                aria-describedby={
                                  renameError ? `category-${row.id}-rename-error` : undefined
                                }
                                data-testid='category-rename-name'
                              />
                              {renderFieldError(`category-${row.id}-rename-error`, renameError)}
                            </label>
                            <button
                              type='submit'
                              className='btn btn-sm'
                              data-testid='rename-category-action'
                            >
                              Rename
                            </button>
                          </form>
                        </td>
                        <td className='text-right'>
                          <form method='post' action={categoryDeletePath(row.id)} noValidate>
                            <button
                              type='submit'
                              className='btn btn-sm btn-error btn-outline'
                              data-testid='delete-category-action'
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
  source: CategoryRow
  target: CategoryRow
  expenseCount: number
}) => {
  const { source, target, expenseCount } = props
  return (
    <div className='max-w-xl mx-auto space-y-4' data-testid='category-merge-confirm-page'>
      <h1 className='text-2xl font-bold'>Merge categories?</h1>
      <p>
        Rename target already exists. Merge{' '}
        <strong data-testid='merge-source-name'>{source.name}</strong> into{' '}
        <strong data-testid='merge-target-name'>{target.name}</strong>?
      </p>
      <p data-testid='merge-expense-count'>All {expenseCount} expenses will be reassigned.</p>
      <form
        method='post'
        action={CATEGORY_MERGE_CONFIRM_PATH}
        className='flex gap-3'
        data-testid='category-merge-confirm-form'
        noValidate
      >
        <input type='hidden' name='sourceId' value={source.id} />
        <input type='hidden' name='targetId' value={target.id} />
        <button
          type='submit'
          className='btn btn-primary'
          data-testid='confirm-merge-category-action'
        >
          Merge categories
        </button>
        <button
          type='submit'
          name='action'
          value='cancel'
          className='btn btn-ghost'
          data-testid='cancel-merge-category-action'
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

export const buildCategories = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.CATEGORIES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await listCategories(db)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load categories. Please try again.')
      }
      const flash = readAndClearFormState(c)
      const state: CategoryFormState = flash
        ? { fieldErrors: flash.fieldErrors ?? {}, values: flash.values ?? {} }
        : emptyState()
      return c.render(useLayout(c, renderCategories(result.value, state)))
    },
  )

  app.post(
    PATHS.CATEGORIES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      const validated = parseCategoryCreate({ name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.CATEGORIES, validated.error, { name: raw.name })
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await createCategory(db, validated.value.name)
      if (result.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.CATEGORIES,
          { name: result.error.message },
          { name: raw.name },
        )
      }
      return redirectWithMessage(c, PATHS.CATEGORIES, 'Category created.')
    },
  )

  app.post(
    '/categories/:id/rename',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const raw = await readRawBody(c)
      const values: ExpenseFormValues = { id, name: raw.name }
      const validated = parseCategoryRename({ id, name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.CATEGORIES, validated.error, values)
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.CATEGORIES,
          'Failed to rename category. Please try again.',
        )
      }
      const source = categoriesResult.value.find((row) => row.id === validated.value.id)
      if (!source) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Category not found.')
      }
      const targetLookup = await findCategoryByName(db, validated.value.name)
      if (targetLookup.isErr) {
        return redirectWithError(
          c,
          PATHS.CATEGORIES,
          'Failed to rename category. Please try again.',
        )
      }
      if (targetLookup.value !== null && targetLookup.value.id !== validated.value.id) {
        const expenseCount = await countCategoryExpenses(db, validated.value.id)
        if (expenseCount.isErr) {
          return redirectWithError(
            c,
            PATHS.CATEGORIES,
            'Failed to rename category. Please try again.',
          )
        }
        return c.render(
          useLayout(
            c,
            renderMergeConfirm({
              source,
              target: targetLookup.value,
              expenseCount: expenseCount.value,
            }),
          ),
        )
      }
      const result = await renameCategory(db, validated.value)
      if (result.isErr) {
        return redirectWithFormErrors(c, PATHS.CATEGORIES, { name: result.error.message }, values)
      }
      return redirectWithMessage(c, PATHS.CATEGORIES, 'Category renamed.')
    },
  )

  app.post(
    CATEGORY_MERGE_CONFIRM_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      if (raw.action === 'cancel') {
        return redirectWithMessage(c, PATHS.CATEGORIES, 'Category merge canceled.')
      }
      const validated = parseCategoryMergeConfirm({
        sourceId: raw.sourceId,
        targetId: raw.targetId,
      })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Invalid merge request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.CATEGORIES,
          'Failed to merge categories. Please try again.',
        )
      }
      const source = categoriesResult.value.find((row) => row.id === validated.value.sourceId)
      const target = categoriesResult.value.find((row) => row.id === validated.value.targetId)
      if (!source || !target) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Category not found.')
      }
      const result = await mergeCategory(db, validated.value)
      if (result.isErr) {
        return redirectWithError(c, PATHS.CATEGORIES, result.error.message)
      }
      return redirectWithMessage(c, PATHS.CATEGORIES, 'Categories merged.')
    },
  )

  app.post(
    '/categories/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const validated = parseCategoryDelete({ id })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Invalid delete request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await deleteCategory(db, validated.value.id)
      if (result.isErr) {
        return redirectWithError(c, PATHS.CATEGORIES, result.error.message)
      }
      return redirectWithMessage(c, PATHS.CATEGORIES, 'Category deleted.')
    },
  )
}
