/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'

import { HTML_STATUS, SIGN_UP_MODES } from './constants'
import { renderer } from './renderer'
import { buildExpenses } from './routes/expenses/build-expenses'
import { buildEditExpense } from './routes/expenses/build-edit-expense'
import { buildCategories } from './routes/build-categories'
import { buildTags } from './routes/build-tags'
import { buildSummary } from './routes/build-summary'
import { buildRecurring } from './routes/build-recurring'
import { buildCreateRecurring } from './routes/recurring/build-create-recurring'
import { buildEditRecurring } from './routes/recurring/build-edit-recurring'
import { build404 } from './routes/build-404'
import { buildEmailConfirmation } from './routes/auth/build-email-confirmation'
import { buildAwaitVerification } from './routes/auth/build-await-verification'
import { createDbClient } from './db/client'
import { buildSignIn } from './routes/auth/build-sign-in'
import { buildSignUp } from './routes/auth/build-sign-up'
import { buildGatedSignUp } from './routes/auth/build-gated-sign-up'
import { buildInterestSignUp } from './routes/auth/build-interest-sign-up'
import { buildGatedInterestSignUp } from './routes/auth/build-gated-interest-sign-up'
import { buildForgotPassword } from './routes/auth/build-forgot-password'
import { buildWaitingForReset } from './routes/auth/build-waiting-for-reset'
import { buildResetPassword } from './routes/auth/build-reset-password'
import { buildSignOut } from './routes/auth/build-sign-out'
import { handleSignUp } from './routes/auth/handle-sign-up'
import { handleGatedSignUp } from './routes/auth/handle-gated-sign-up'
import { handleInterestSignUp } from './routes/auth/handle-interest-sign-up'
import { handleGatedInterestSignUp } from './routes/auth/handle-gated-interest-sign-up'
import { handleSignOut } from './routes/auth/handle-sign-out'
import { handleResendEmail } from './routes/auth/handle-resend-email'
import { handleForgotPassword } from './routes/auth/handle-forgot-password'
import { handleResetPassword } from './routes/auth/handle-reset-password'
import { buildProfile } from './routes/profile/build-profile'
import { buildDeleteConfirm } from './routes/profile/build-delete-confirm'
import { handleChangePassword } from './routes/profile/handle-change-password'
import { handleDeleteAccount } from './routes/profile/handle-delete-account'
import { setupBetterAuth, setupBetterAuthMiddleware } from './routes/auth/better-auth-handler'
import { setupBetterAuthResponseInterceptor } from './routes/auth/better-auth-response-interceptor'

import { Bindings } from './local-types'
import { validateEnvBindings } from './middleware/guard-sign-up-mode'
import { scheduled } from './scheduled'

/**
 * Validates that all required environment variables are set
 * Returns `false` if any required variables are missing, otherwise returns `true`
 */
const validateEnvironmentVariables = (): boolean => {
  const requiredVars = [
    'BETTER_AUTH_SECRET',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_DATABASE_ID',
    'CLOUDFLARE_D1_TOKEN',
    'SIGN_UP_MODE',
    'EMAIL_SEND_URL',
    'EMAIL_SEND_CODE',
  ]

  const missingVars: string[] = []

  for (const varName of requiredVars) {
    const envValue = String(env[varName as keyof typeof env] ?? '')
    if (!envValue || envValue.trim() === '') {
      missingVars.push(varName)
    }
  }

  if (missingVars.length > 0) {
    console.error(`❌ ERROR: Missing required environment variables: ${missingVars.join(', ')}`)
    console.error('Please set these environment variables before starting the application.')
    return false
  }

  console.log('✅ All required environment variables are set')
  return true
}

// Validate environment variables on startup
if (!validateEnvironmentVariables()) {
  console.log('==============> Environment variables are not valid!')
  console.log('==============> Environment variables are not valid!')
  console.log('==============> Environment variables are not valid!')
  console.log('==============> Environment variables are not valid!')
  console.log('==============> Environment variables are not valid!')
}

const app = new Hono<{ Bindings: Bindings }>()



// Apply middleware
app.use(secureHeaders({ referrerPolicy: 'strict-origin-when-cross-origin' }))
// Apply CSRF protection to all routes except test endpoints
app.use(async (c, next) => {

  // Apply CSRF protection to all other routes
  const csrfMiddleware = csrf({
    origin: (origin: string) => {
       return /https:\/\/expenses.cls.cloud$/.test(origin) || 
        /https:\/\/expense-log.cleverfox.workers.dev$/.test(origin)  
    },
  })

  return csrfMiddleware(c, next)
})
app.use(
  bodyLimit({
     maxSize: 4 * 1024, // 4kb 
    onError: (c) => {
      console.log('Body limit exceeded')
      // NOTE: This 'c.text' instead of a 'redirectWithError' is correct, and should not be changed
      return c.text('overflow :(', HTML_STATUS.CONTENT_TOO_LARGE)
    },
  }),
)

app.use(logger())
app.use(renderer)

// Validate required environment bindings at runtime
app.use(validateEnvBindings)

// Initialize db client for each request
app.use(async (c, next) => {
  // Create DB client for this request
  const db = createDbClient(c.env.PROJECT_DB)
  c.set('db', db)

  await next()
})

// Setup auth middleware and routes
setupBetterAuthMiddleware(app)
setupBetterAuthResponseInterceptor(app) // Must come before setupBetterAuth to intercept responses
setupBetterAuth(app)

// Route declarations
buildExpenses(app)
buildEditExpense(app)
buildCategories(app)
buildTags(app)
buildSummary(app)
buildRecurring(app)
buildCreateRecurring(app)
buildEditRecurring(app)
buildSignIn(app)
if (env.SIGN_UP_MODE === SIGN_UP_MODES.OPEN_SIGN_UP) {
  buildSignUp(app)
  handleSignUp(app)
  buildAwaitVerification(app)
  handleResendEmail(app)
} else if (env.SIGN_UP_MODE === SIGN_UP_MODES.GATED_SIGN_UP) {
  buildGatedSignUp(app)
  handleGatedSignUp(app)
  buildAwaitVerification(app)
  handleResendEmail(app)
} else if (env.SIGN_UP_MODE === SIGN_UP_MODES.INTEREST_SIGN_UP) {
  buildInterestSignUp(app)
  handleInterestSignUp(app)
  buildAwaitVerification(app)
  handleResendEmail(app)
} else if (env.SIGN_UP_MODE === SIGN_UP_MODES.BOTH_SIGN_UP) {
  buildGatedInterestSignUp(app)
  handleGatedInterestSignUp(app)
  buildAwaitVerification(app)
  handleResendEmail(app)
}
buildForgotPassword(app)
buildWaitingForReset(app)
buildResetPassword(app)
buildEmailConfirmation(app)
buildSignOut(app)
handleSignOut(app)
handleForgotPassword(app)
handleResetPassword(app)
buildProfile(app)
buildDeleteConfirm(app)
handleChangePassword(app)
handleDeleteAccount(app)



// this MUST be the last route declared!
build404(app)

export default { fetch: app.fetch, scheduled }
