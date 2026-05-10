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
  updateManyAndRecurring,
  deleteRecurring,
} from '../../lib/db/expense-access'
import {
  listCategories,
  findCategoryByName,
} from '../../lib/db/category-access'
import {
  listTags,
  findTagsByNames,
} from '../../lib/db/tag-access'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseRecurringCreate,
  parseNewCategoryName,
  parseTagCsv,
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
  const form = await c.req.parseBody()
  return {
    description: typeof form.description === 'string' ? form.description : '',
    amount: typeof form.amount === 'string' ? form.amount : '',
    category: typeof form.category === 'string' ? form.category : '',
    tags: typeof form.tags === 'string' ? form.tags : '',
    recurrence: typeof form.recurrence === 'string' ? form.recurrence : '',
    anchorDate: typeof form.anchorDate === 'string' ? form.anchorDate : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}

const computeNewItemsDiff = (
  categoryLookup: { id: string; name: string } | null,
  tagLookup: { id: string; name: string }[],
  loweredTagNames: string[],
) => {
  const existingTagByLower = new Map<string, { id: string; name: string }>()
  for (const row of tagLookup) {
    existingTagByLower.set(row.name.toLowerCase(), row)
  }
  const newTagNames: string[] = []
  const existingTagIds: string[] = []
  for (const lowered of loweredTagNames) {
    const match = existingTagByLower.get(lowered)
    if (match) {
      existingTagIds.push(match.id)
    } else {
      newTagNames.push(lowered)
    }
  }
  return {
    newCategoryIsNew: categoryLookup === null,
    existingCategoryRow: categoryLookup,
    existingTagIds,
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
      const payloads: RecurringFormPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value.map((row) => ({ name: row.name })),
      }
      const flash = readAndClearFormState(c)
      const state: RecurringFormState = flash
        ? {
            fieldErrors: flash.fieldErrors ?? {},
            values: {
              description: flash.values?.description ?? template.description,
              amount: flash.values?.amount ?? formatCentsPlain(template.amountCents),
              category: flash.values?.category ?? template.categoryName,
              tags: flash.values?.tags ?? template.tagNames.slice().sort((a, b) => a.localeCompare(b)).join(', '),
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
              tags: template.tagNames.slice().sort((a, b) => a.localeCompare(b)).join(', '),
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
            <script src='/js/tag-chip-picker.js' defer></script>
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
        tags: raw.tags,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      }
      const editPath = `/recurring/${id}/edit`

      const validated = parseRecurringCreate({
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        tags: raw.tags,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      })
      const tagParse = parseTagCsv(raw.tags)
      if (validated.isErr || tagParse.isErr) {
        const errs: FieldErrors = validated.isErr ? { ...validated.error } : {}
        if (tagParse.isErr) {
          errs.tags = tagParse.error
        }
        return redirectWithFormErrors(c, editPath, errs, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const templateResult = await getRecurringById(db, id)
      if (templateResult.isErr || templateResult.value === null) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }

      const diff = computeNewItemsDiff(lookup.value, tagLookup.value, tagParse.value)
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

      const sortedNewTags = diff.newTagNames.slice().sort((a, b) => a.localeCompare(b))
      const finalTagNames = tagParse.value.slice().sort((a, b) => a.localeCompare(b))
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
            values: rawValues,
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
        tags: raw.tags,
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
        tags: raw.tags,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      })
      const tagParse = parseTagCsv(raw.tags)
      if (validated.isErr || tagParse.isErr) {
        const errs: FieldErrors = validated.isErr ? { ...validated.error } : {}
        if (tagParse.isErr) {
          errs.tags = tagParse.error
        }
        return redirectWithFormErrors(c, editPath, errs, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const templateResult = await getRecurringById(db, id)
      if (templateResult.isErr || templateResult.value === null) {
        return redirectWithError(c, PATHS.RECURRING, 'Recurring template not found.')
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(c, editPath, 'Failed to save template. Please try again.')
      }

      const diff = computeNewItemsDiff(lookup.value, tagLookup.value, tagParse.value)
      let newCategoryName: string | null = null
      let existingCategoryId: string | null = null
      if (diff.existingCategoryRow !== null) {
        existingCategoryId = diff.existingCategoryRow.id
      } else {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(c, editPath, { category: nameCheck.error }, rawValues)
        }
        newCategoryName = nameCheck.value
      }

      const updateResult = await updateManyAndRecurring(db, {
        id,
        newCategoryName,
        existingCategoryId,
        newTagNames: diff.newTagNames,
        existingTagIds: diff.existingTagIds,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
        recurrence: validated.value.recurrence,
        anchorDate: validated.value.anchorDate,
      })
      if (updateResult.isErr) {
        const errs: FieldErrors =
          newCategoryName !== null
            ? { category: updateResult.error.message }
            : { tags: updateResult.error.message }
        return redirectWithFormErrors(c, editPath, errs, rawValues)
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
