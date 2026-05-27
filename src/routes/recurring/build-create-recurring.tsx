/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the recurring-template create flow.
 * Registers GET /recurring/new, POST /recurring, and
 * POST /recurring/confirm-create-new.
 * @module routes/recurring/buildCreateRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { ALLOW_SCRIPTS_SECURE_HEADERS, PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { createDbClient } from '../../db/client'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import {
  createRecurringWithTags,
  createManyAndRecurring,
} from '../../lib/db/expense-access'
import {
  resolveConfirmTagsAndCategory,
} from '../../lib/db/confirm-helpers'
import {
  listCategories,
} from '../../lib/db/category-access'
import { redirectWithError, redirectWithMessage } from '../../lib/redirects'
import {
  parseRecurringCreate,
  type FieldErrors,
} from '../../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../../lib/form-state'
import {
  renderConfirmNewItems,
} from '../expenses/expense-form'
import {
  renderRecurringForm,
  type RecurringFormState,
  type RecurringFormPayloads,
} from './recurring-form'
import { todayEt } from '../../lib/et-date'

const newPath = '/recurring/new'
const createPath = '/recurring'
const confirmCreateNewPath = '/recurring/confirm-create-new'

const emptyRecurringState = (today: string): RecurringFormState => ({
  fieldErrors: {},
  values: {
    description: '',
    amount: '',
    category: '',
    tagIds: [],
    newTags: '',
    recurrence: '',
    anchorDate: today,
  },
})

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


export const buildCreateRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  // ---------- GET /recurring/new ----------
  app.get(
    newPath,
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)
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
        tags: tagsResult.value,
      }
      const flash = readAndClearFormState(c)
      const today = todayEt()
      const state: RecurringFormState = flash
        ? {
            fieldErrors: flash.fieldErrors ?? {},
            values: {
              description: flash.values?.description ?? '',
              amount: flash.values?.amount ?? '',
              category: flash.values?.category ?? '',
              tagIds: flash.values?.tagIds ?? [],
              newTags: flash.values?.newTags ?? '',
              recurrence: flash.values?.recurrence ?? '',
              anchorDate: flash.values?.anchorDate ?? today,
            },
          }
        : emptyRecurringState(today)
      return c.render(
        useLayout(
          c,
          <div data-testid='recurring-new-page'>
            <h1 className='text-2xl font-bold mb-4'>New recurring template</h1>
            {renderRecurringForm({
              mode: 'create',
              action: createPath,
              state,
              payloads,
            })}
            <a href={PATHS.RECURRING} className='btn btn-ghost mt-2' data-testid='recurring-new-back'>
              Back to list
            </a>
            <script src='/js/category-combobox.js' defer></script>
            <script src='/js/tag-chip-checkboxes.js' defer></script>
          </div>,
        ),
      )
    },
  )

  // ---------- POST /recurring ----------
  app.post(
    createPath,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
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

      const validated = parseRecurringCreate({
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      })

      if (validated.isErr) {
        return redirectWithFormErrors(c, newPath, validated.error, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)

      const allTagsResult = await listTags(db)
      if (allTagsResult.isErr) {
        return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
      }

      const tagInputParse = parseTagInputs(
        { tagId: raw.tagId, newTags: raw.newTags },
        allTagsResult.value,
      )
      if (Object.keys(tagInputParse.fieldErrors).length > 0) {
        return redirectWithFormErrors(c, newPath, tagInputParse.fieldErrors, {
          ...rawValues,
          newTags: tagInputParse.rawNewTagsPreserved,
        })
      }

      const resolvedIdSet = new Set(allTagsResult.value.map((t) => t.id))
      const unknownIds = tagInputParse.lookupCandidateTagIds.filter((id) => !resolvedIdSet.has(id))
      if (unknownIds.length > 0) {
        return redirectWithFormErrors(c, newPath, { tags: 'One or more selected tags no longer exist.' }, rawValues)
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
      }

      const existingTagIds = tagInputParse.tagIds
      const newTagNames = tagInputParse.newTags

      const categoryIsNew = lookup.value === null
      const anyNew = categoryIsNew || newTagNames.length > 0

      if (!anyNew) {
        const createResult = await createRecurringWithTags(db, {
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          categoryId: lookup.value!.id,
          recurrence: validated.value.recurrence,
          anchorDate: validated.value.anchorDate,
          tagIds: existingTagIds,
        })
        if (createResult.isErr) {
          return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
        }
        return redirectWithMessage(c, PATHS.RECURRING, 'Recurring template created.')
      }

      let normalizedNewCategory: string | null = null
      let finalCategoryName: string
      if (categoryIsNew) {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(c, newPath, { category: nameCheck.error }, rawValues)
        }
        normalizedNewCategory = nameCheck.value.toLowerCase()
        finalCategoryName = normalizedNewCategory
      } else {
        finalCategoryName = lookup.value!.name
      }

      const allTagsById = new Map(allTagsResult.value.map((t) => [t.id, t.name]))
      const existingTagNames = existingTagIds.map((id) => allTagsById.get(id) ?? '').filter(Boolean)

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
            mode: 'create',
            entity: 'recurring',
            action: confirmCreateNewPath,
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

  // ---------- POST /recurring/confirm-create-new ----------
  app.post(
    confirmCreateNewPath,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
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

      if (raw.action === 'cancel') {
        return redirectWithFormErrors(c, newPath, {}, rawValues)
      }

      const validated = parseRecurringCreate({
        description: raw.description,
        amount: raw.amount,
        category: raw.category,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
      })

      if (validated.isErr) {
        return redirectWithFormErrors(c, newPath, validated.error, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)

      const resolved = await resolveConfirmTagsAndCategory(
        db,
        raw.tagId,
        raw.newTags,
        validated.value.category,
      )
      if (!resolved.ok) {
        if (resolved.kind === 'tag-list-error') {
          return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
        }
        if (resolved.kind === 'tag-input-error') {
          return redirectWithFormErrors(c, newPath, resolved.fieldErrors, {
            ...rawValues,
            newTags: resolved.rawNewTagsPreserved,
          })
        }
        if (resolved.kind === 'category-lookup-error') {
          return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
        }
        if (resolved.kind === 'new-category-name-error') {
          return redirectWithFormErrors(c, newPath, { category: resolved.message }, rawValues)
        }
      }

      const { existingTagIds, newTagNames, existingCategoryId, newCategoryName } = resolved as Extract<typeof resolved, { ok: true }>

      const createResult = await createManyAndRecurring(db, {
        newCategoryName: newCategoryName ?? null,
        existingCategoryId: existingCategoryId ?? null,
        newTagNames,
        existingTagIds,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
        recurrence: validated.value.recurrence,
        anchorDate: validated.value.anchorDate,
      })
      if (createResult.isErr) {
        const errs: FieldErrors =
          newCategoryName !== null
            ? { category: createResult.error.message }
            : { tags: createResult.error.message }
        return redirectWithFormErrors(c, newPath, errs, rawValues)
      }

      return redirectWithMessage(c, PATHS.RECURRING, 'Recurring template created.')
    },
  )
}
