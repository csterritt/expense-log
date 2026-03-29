import { Page } from '@playwright/test'
import { fillInput, clickLink } from './finders'

/**
 * Form fill helpers for expense creation and editing
 */

export type ExpenseFormData = {
  amount: string
  date: string
  description: string
  newCategory?: string
  newTags?: string
}

/**
 * Fill and submit the new expense form on the expenses list page
 */
export const fillExpenseForm = async (page: Page, data: ExpenseFormData): Promise<void> => {
  await fillInput(page, 'expense-amount-input', data.amount)
  await fillInput(page, 'expense-date-input', data.date)
  await fillInput(page, 'expense-description-input', data.description)
  if (data.newCategory) {
    await fillInput(page, 'expense-new-category-input', data.newCategory)
  }
  if (data.newTags) {
    await fillInput(page, 'expense-tags-input', data.newTags)
  }
}

/**
 * Fill and submit the new expense form, then click submit
 */
export const createExpense = async (page: Page, data: ExpenseFormData): Promise<void> => {
  await fillExpenseForm(page, data)
  await clickLink(page, 'create-expense-action')
}

/**
 * Fill the edit expense form fields (without submitting)
 */
export const fillEditExpenseForm = async (
  page: Page,
  data: Partial<ExpenseFormData>,
): Promise<void> => {
  if (data.amount !== undefined) {
    await fillInput(page, 'expense-amount-input', data.amount)
  }
  if (data.date !== undefined) {
    await fillInput(page, 'expense-date-input', data.date)
  }
  if (data.description !== undefined) {
    await fillInput(page, 'expense-description-input', data.description)
  }
  if (data.newCategory !== undefined) {
    await fillInput(page, 'expense-new-category-input', data.newCategory)
  }
  if (data.newTags !== undefined) {
    await fillInput(page, 'expense-tags-input', data.newTags)
  }
}

/**
 * Update an expense: fill form then submit
 */
export const updateExpense = async (page: Page, data: Partial<ExpenseFormData>): Promise<void> => {
  await fillEditExpenseForm(page, data)
  await clickLink(page, 'update-expense-action')
}
