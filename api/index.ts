import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
import { requestLogger } from './middleware/logger'
import { errorHandler } from './middleware/error-handler'
import { securityHeaders } from './middleware/security-headers'
import { mountApiRoutes } from './routes'
import { err } from './lib/response'
import { ErrorCodes, ErrorMessages } from '../src/lib/error-codes'

export type Env = {
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace
  ASSETS: Fetcher
  JWT_SECRET: string
  APP_URL: string
  APP_PASSWORD: string
  CORS_EXTRA_ORIGINS?: string
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
}

const app = new Hono<{ Bindings: Env }>()

// Middleware order:
// 1) requestLogger — first, so requestId + timing wrap everything (including error paths).
// 2) errorHandler  — inside logger, outside CORS: thrown errors still produce a structured 500 envelope.
// 3) corsMiddleware — after errorHandler so CORS response headers are added even to error envelopes.
// 4) securityHeaders — outermost that touches response headers; runs on the way
//    back so its headers survive both CORS and error envelopes.
app.use('*', requestLogger())
app.use('*', errorHandler())
app.use('*', corsMiddleware())
app.use('*', securityHeaders())

app.route('/api', mountApiRoutes())

// SPA fallback: non-API paths that don't match a static asset should serve
// index.html so client-side routing (React Router) can handle them. Without
// this, refreshing /list or /board returns a JSON 404 envelope from the
// Worker and the SPA never boots.
app.notFound((c) => {
  const url = new URL(c.req.url)
  if (url.pathname.startsWith('/api/')) {
    return err(c, ErrorCodes.NOT_FOUND, ErrorMessages[ErrorCodes.NOT_FOUND])
  }
  return c.env.ASSETS.fetch(new Request(new URL('/', url), c.req.raw))
})

// Fallback for uncaught errors that escape errorHandler (should never happen).
app.onError((e, c) => {
  console.error('[app.onError]', e)
  return err(
    c,
    ErrorCodes.INTERNAL_ERROR,
    ErrorMessages[ErrorCodes.INTERNAL_ERROR],
  )
})

export default app
