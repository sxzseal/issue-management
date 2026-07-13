import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
import { requestLogger } from './middleware/logger'
import { errorHandler } from './middleware/error-handler'
import { mountApiRoutes } from './routes'
import { err } from './lib/response'
import { ErrorCodes, ErrorMessages } from '../src/lib/error-codes'

export type Env = {
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace
  JWT_SECRET: string
  WEBHOOK_SECRET: string
  APP_URL: string
  CORS_EXTRA_ORIGINS?: string
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
}

const app = new Hono<{ Bindings: Env }>()

// Middleware order:
// 1) requestLogger — first, so requestId + timing wrap everything (including error paths).
// 2) errorHandler  — inside logger, outside CORS: thrown errors still produce a structured 500 envelope.
// 3) corsMiddleware — after errorHandler so CORS response headers are added even to error envelopes.
app.use('*', requestLogger())
app.use('*', errorHandler())
app.use('*', corsMiddleware())

app.route('/api', mountApiRoutes())

app.notFound((c) => err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND]))

// Fallback for uncaught errors that escape errorHandler (should never happen).
app.onError((e, c) => {
  console.error('[app.onError]', e)
  return err(c, ErrorCodes.INTERNAL_ERROR, ErrorMessages[ErrorCodes.INTERNAL_ERROR])
})

export default app
