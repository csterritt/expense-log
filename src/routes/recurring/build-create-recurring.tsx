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
    tags: '',
    recurrence: '',
    anchorDate: today,
  },
})

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

type DiffResult = {
  newCategoryIsNew: boolean
  existingCategoryRow: { id: string; name: string } | null
  existingTagIds: string[]
  newTagNames: string[]
  existingTagRows: { id: string; name: string }[]
}

const computeNewItemsDiff = (
  categoryLookup: { id: string; name: string } | null,
  tagLookup: { id: string; name: string }[],
  loweredTagNames: string[],
): DiffResult => {
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
    existingTagRows: tagLookup,
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
        tags: tagsResult.value.map((row) => ({ name: row.name })),
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
              tags: flash.values?.tags ?? '',
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
            <script src='/js/tag-chip-picker.js' defer></script>
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
        tags: raw.tags,
        recurrence: raw.recurrence,
        anchorDate: raw.anchorDate,
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
        return redirectWithFormErrors(c, newPath, errs, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
      }

      const diff = computeNewItemsDiff(lookup.value, tagLookup.value, tagParse.value)
      const anyNew = diff.newCategoryIsNew || diff.newTagNames.length > 0

      if (!anyNew) {
        const createResult = await createRecurringWithTags(db, {
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          categoryId: diff.existingCategoryRow!.id,
          recurrence: validated.value.recurrence,
          anchorDate: validated.value.anchorDate,
          tagIds: diff.existingTagIds,
        })
        if (createResult.isErr) {
          return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
        }
        return redirectWithMessage(c, PATHS.RECURRING, 'Recurring template created.')
      }

      let normalizedNewCategory: string | null = null
      let finalCategoryName: string
      if (diff.newCategoryIsNew) {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(c, newPath, { category: nameCheck.error }, rawValues)
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
            mode: 'create',
            entity: 'recurring',
            action: confirmCreateNewPath,
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
        tags: raw.tags,
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
        return redirectWithFormErrors(c, newPath, errs, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(c, newPath, 'Failed to save template. Please try again.')
      }
      const diff = computeNewItemsDiff(lookup.value, tagLookup.value, tagParse.value)

      let newCategoryName: string | null = null
      let existingCategoryId: string | null = null
      if (diff.existingCategoryRow !== null) {
        existingCategoryId = diff.existingCategoryRow.id
      } else {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(c, newPath, { category: nameCheck.error }, rawValues)
        }
        newCategoryName = nameCheck.value
      }

      const createResult = await createManyAndRecurring(db, {
        newCategoryName,
        existingCategoryId,
        newTagNames: diff.newTagNames,
        existingTagIds: diff.existingTagIds,
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
