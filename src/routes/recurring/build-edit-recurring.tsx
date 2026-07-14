/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for recurring-template edit, confirm-edit-new, and delete flows.
 * Registers:
 *   GET  /recurring/:id/edit
 *   POST /recurring/:id/edit
 *   POST /recurring/:id/confirm-edit-new
 *   GET  /recurring/:id/delete
 *   POST /recurring/:id/delete
 * @module routes/recurring/buildEditRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { ALLOW_SCRIPTS_SECURE_HEADERS, PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import {
  getRecurringById,
  updateRecurringWithTags,
  deleteRecurring,
} from '../../lib/db/expense-access'
import {
  createOrReuseCategory,
  createOrReuseTag,
  resolveConfirmTagsAndCategory,
} from '../../lib/db/confirm-helpers'
import {
  listCategories,
  findCategoryByName,
} from '../../lib/db/category-access'
import {
  listTags,
} from '../../lib/db/tag-access'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseRecurringCreate,
  parseNewCategoryName,
  parseTagInputs,
  type FieldErrors,
} from '../../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../../lib/form-state'
import { renderConfirmNewItems } from '../expenses/expense-form'
import {
  renderRecurringForm,
  type RecurringFormState,
  type RecurringFormPayloads,
} from './recurring-form'
import { formatCents, formatCentsPlain } from '../../lib/money'

const requireId = (c: Context<{ Bindings: Bindings }>): string | null => {
  const id = c.req.param('id')
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null
}

const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody({ all: true })
  const rawTagId = form['tagId']
  const tagId: string[] = Array.isArray(rawTagId)
    ? rawTagId.filter((v): v is string => typeof v === 'string')
    : typeof rawTagId === 'string'
      ? [rawTagId]
      : []
  return {
    description: typeof form.description === 'string' ? form.description : '',
    amount: typeof form.amount === 'string' ? form.amount : '',
    category: typeof form.category === 'string' ? form.category : '',
    tagId,
    newTags: typeof form.newTags === 'string' ? form.newTags : '',
    recurrence: typeof form.recurrence === 'string' ? form.recurrence : '',
    anchorDate: typeof form.anchorDate === 'string' ? form.anchorDate : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}

const computeNewItemsDiff = (
  categoryLookup: { id: string; name: string } | null,
  resolvedTagIds: string[],
  newTagNames: string[],
) => {
  return {
    newCategoryIsNew: categoryLookup === null,
    existingCategoryRow: categoryLookup,
    existingTagIds: resolvedTagIds,
    newTagNames,
  }
}

export const buildEditRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  // ---------- GET /recurring/:id/edit ----------
  app.get(
    '/recurring/:id/edit',
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      if (!id) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const templateResult = await getRecurringById(db, id)
      if (templateResult.isErr) {
        return redirectWithError(c, PATHS.RECURRING, 'Failed to load template. Please try again.')
      }
      if (templateResult.value === null) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const template = templateResult.value

      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(c, PATHS.RECURRING, 'Failed to load form. Please try again.')
      }
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.RECURRING, 'Failed to load form. Please try again.')
      }
      const allTagIds = template.tagIds ?? []
      const defaultTagIds = allTagIds.length > 0
        ? tagsResult.value.filter((t) => allTagIds.includes(t.id)).map((t) => t.id)
        : []

      const payloads: RecurringFormPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value,
      }
      const flash = readAndClearFormState(c)
      const state: RecurringFormState = flash
        ? {
            fieldErrors: flash.fieldErrors ?? {},
            values: {
              description: flash.values?.description ?? template.description,
              amount: flash.values?.amount ?? formatCentsPlain(template.amountCents),
              category: flash.values?.category ?? template.categoryName,
              tagIds: flash.values?.tagIds ?? defaultTagIds,
              newTags: flash.values?.newTags ?? '',
              recurrence: flash.values?.recurrence ?? template.recurrence,
              anchorDate: flash.values?.anchorDate ?? template.anchorDate,
            },
          }
        : {
            fieldErrors: {},
            values: {
              description: template.description,
              amount: formatCentsPlain(template.amountCents),
              category: template.categoryName,
              tagIds: defaultTagIds,
              newTags: '',
              recurrence: template.recurrence,
              anchorDate: template.anchorDate,
            },
          }
      return c.render(
        useLayout(
          c,
          <div data-testid='recurring-edit-page'>
            <div className='flex items-center justify-between mb-4'>
              <h1 className='text-2xl font-bold'>Edit recurring template</h1>
              <a
                href={`/recurring/${id}/delete`}
                className='btn btn-error btn-sm'
                data-testid='recurring-edit-delete'
              >
                Delete
              </a>
            </div>
            {renderRecurringForm({
              mode: 'edit',
              action: `/recurring/${id}/edit`,
              state,
              payloads,
            })}
            <a href={PATHS.RECURRING} className='btn btn-ghost mt-2' data-testid='recurring-edit-back'>
              Back to list
            </a>
            <script src='/js/category-combobox.js' defer></script>
            <script src='/js/tag-chip-checkboxes.js' defer></script>
          </div>,
        ),
      )
    },
  )

  // ---------- POST /recurring/:id/edit ----------
  app.post(
    '/recurring/:id/edit',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      if (!id) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const raw = await readRawBody(c)
      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        tagIds: raw.tagId,
        newTags: raw.newTags,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      }
      const editPath = `/recurring/${id}/edit`

      const validated = parseRecurringCreate({
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      })

      if (validated.isErr) {
        return redirectWithFormErrors(c, editPath, validated.error, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const templateResult = await getRecurringById(db, id)
      if (templateResult.isErr || templateResult.value === null) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }

      const allTagsResult = await listTags(db)
      if (allTagsResult.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }

      const tagInputParse = parseTagInputs(
        { tagId: raw.tagId, newTags: raw.newTags },
        allTagsResult.value,
      )
      if (Object.keys(tagInputParse.fieldErrors).length > 0) {
        return redirectWithFormErrors(c, editPath, tagInputParse.fieldErrors, {
          ...rawValues,
          newTags: tagInputParse.rawNewTagsPreserved,
        })
      }

      const resolvedIdSet = new Set(allTagsResult.value.map((t) => t.id))
      const unknownIds = tagInputParse.lookupCandidateTagIds.filter((id) => !resolvedIdSet.has(id))
      if (unknownIds.length > 0) {
        return redirectWithFormErrors(c, editPath, { tags: 'One or more selected tags no longer exist.' }, rawValues)
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }

      const existingTagIds = tagInputParse.tagIds
      const newTagNames = tagInputParse.newTags

      const diff = computeNewItemsDiff(lookup.value, existingTagIds, newTagNames)
      const anyNew = diff.newCategoryIsNew || diff.newTagNames.length > 0

      if (!anyNew) {
        const updateResult = await updateRecurringWithTags(db, {
          id,
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          categoryId: diff.existingCategoryRow!.id,
          recurrence: validated.value.recurrence,
          anchorDate: validated.value.anchorDate,
          tagIds: diff.existingTagIds,
        })
        if (updateResult.isErr) {
          return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
        }
        return redirectWithMessage(c, PATHS.RECURRING, 'Recurring template updated.')
      }

      let normalizedNewCategory: string | null = null
      let finalCategoryName: string
      if (diff.newCategoryIsNew) {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(c, editPath, { category: nameCheck.error }, rawValues)
        }
        normalizedNewCategory = nameCheck.value.toLowerCase()
        finalCategoryName = normalizedNewCategory
      } else {
        finalCategoryName = diff.existingCategoryRow!.name
      }

      const allTagsById = new Map(allTagsResult.value.map((t) => [t.id, t.name]))
      const existingTagNames = existingTagIds.map((tagId) => allTagsById.get(tagId) ?? '').filter(Boolean)
      const sortedNewTags = newTagNames.slice().sort((a, b) => a.localeCompare(b))
      const allTagNames = [...existingTagNames, ...newTagNames]
      const finalTagNames = allTagNames.slice().sort((a, b) => a.localeCompare(b))

      const confirmValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        tagIds: existingTagIds,
        newTags: newTagNames.join(','),
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      }

      return c.render(
        useLayout(
          c,
          renderConfirmNewItems({
            mode: 'edit',
            entity: 'recurring',
            action: `/recurring/${id}/confirm-edit-new`,
            newCategoryName: normalizedNewCategory,
            finalCategoryName,
            newTagNames: sortedNewTags,
            finalTagNames,
            values: confirmValues,
          }),
        ),
      )
    },
  )

  // ---------- POST /recurring/:id/confirm-edit-new ----------
  app.post(
    '/recurring/:id/confirm-edit-new',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      if (!id) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const raw = await readRawBody(c)
      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        tagIds: raw.tagId,
        newTags: raw.newTags,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      }
      const editPath = `/recurring/${id}/edit`

      if (raw.action === 'cancel') {
        return redirectWithFormErrors(c, editPath, {}, rawValues)
      }

      const validated = parseRecurringCreate({
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      })

      if (validated.isErr) {
        return redirectWithFormErrors(c, editPath, validated.error, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const templateResult = await getRecurringById(db, id)
      if (templateResult.isErr || templateResult.value === null) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }

      const resolved = await resolveConfirmTagsAndCategory(
        db,
        raw.tagId,
        raw.newTags,
        validated.value.category,
      )
      if (!resolved.ok) {
        if (resolved.kind === 'tag-list-error') {
          return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
        }
        if (resolved.kind === 'tag-input-error') {
          return redirectWithFormErrors(c, editPath, resolved.fieldErrors, {
            ...rawValues,
            newTags: resolved.rawNewTagsPreserved,
          })
        }
        if (resolved.kind === 'category-lookup-error') {
          return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
        }
        if (resolved.kind === 'new-category-name-error') {
          return redirectWithFormErrors(c, editPath, { category: resolved.message }, rawValues)
        }
      }

      const { existingTagIds, newTagNames, existingCategoryId } = resolved as Extract<typeof resolved, { ok: true }>
      let resolvedCategoryId: string = existingCategoryId ?? ''

      if (existingCategoryId === null) {
        const { newCategoryName } = resolved as Extract<typeof resolved, { ok: true }>
        const catResult = await createOrReuseCategory(db, newCategoryName!)
        if (catResult.isErr) {
          return redirectWithFormErrors(c, editPath, { category: catResult.error.message }, rawValues)
        }
        resolvedCategoryId = catResult.value.id
      }

      const resolvedNewTagIds: string[] = []
      for (const name of newTagNames) {
        const tagResult = await createOrReuseTag(db, name)
        if (tagResult.isErr) {
          return redirectWithFormErrors(c, editPath, { tags: tagResult.error.message }, rawValues)
        }
        resolvedNewTagIds.push(tagResult.value.id)
      }

      const allTagIds = Array.from(new Set([...existingTagIds, ...resolvedNewTagIds]))
      const updateResult = await updateRecurringWithTags(db, {
        id,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
        categoryId: resolvedCategoryId,
        recurrence: validated.value.recurrence,
        anchorDate: validated.value.anchorDate,
        tagIds: allTagIds,
      })
      if (updateResult.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }

      return redirectWithMessage(c, PATHS.RECURRING, 'Recurring template updated.')
    },
  )

  // ---------- GET /recurring/:id/delete ----------
  app.get(
    '/recurring/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      if (!id) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const templateResult = await getRecurringById(db, id)
      if (templateResult.isErr || templateResult.value === null) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const template = templateResult.value
      return c.render(
        useLayout(
          c,
          <div className='max-w-xl mx-auto' data-testid='confirm-delete-recurring-page'>
            <h1 className='text-2xl font-bold mb-6'>Delete recurring template?</h1>
            <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mb-6'>
              <dt className='font-semibold'>Description</dt>
              <dd data-testid='confirm-delete-recurring-description'>{template.description}</dd>
              <dt className='font-semibold'>Amount</dt>
              <dd data-testid='confirm-delete-recurring-amount'>{formatCents(template.amountCents)}</dd>
              <dt className='font-semibold'>Category</dt>
              <dd data-testid='confirm-delete-recurring-category'>{template.categoryName}</dd>
              <dt className='font-semibold'>Tags</dt>
              <dd data-testid='confirm-delete-recurring-tags'>
                {template.tagNames.slice().sort((a, b) => a.localeCompare(b)).join(', ')}
              </dd>
              <dt className='font-semibold'>Recurrence</dt>
              <dd data-testid='confirm-delete-recurring-recurrence'>{template.recurrence}</dd>
              <dt className='font-semibold'>Anchor date</dt>
              <dd data-testid='confirm-delete-recurring-anchor-date'>{template.anchorDate}</dd>
            </dl>
            <p className='text-sm text-base-content/60 mb-6'>
              Past generated expenses linked to this template will remain but will no longer be associated with it.
            </p>
            <div className='flex gap-3'>
              <form method='post' action={`/recurring/${id}/delete`}>
                <button
                  type='submit'
                  className='btn btn-error'
                  data-testid='confirm-delete-recurring-confirm'
                >
                  Delete
                </button>
              </form>
              <a
                href={`/recurring/${id}/edit`}
                className='btn btn-ghost'
                data-testid='confirm-delete-recurring-cancel'
              >
                Cancel
              </a>
            </div>
          </div>,
        ),
      )
    },
  )

  // ---------- POST /recurring/:id/delete ----------
  app.post(
    '/recurring/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      if (!id) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await deleteRecurring(db, id)
      if (result.isErr) {
        return redirectWithError(c, PATHS.RECURRING, result.error.message)
      }
      return redirectWithMessage(c, PATHS.RECURRING, 'Recurring template deleted.')
    },
  )
}
