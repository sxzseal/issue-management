import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

export type Env = {
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace
  JWT_SECRET: string
  WEBHOOK_SECRET: string
  APP_URL: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
  }),
)

app.get('/api/ping', (c) =>
  c.json({ status_code: 0, data: { pong: true, ts: new Date().toISOString() } }),
)

app.onError((err, c) => {
  console.error('unhandled:', err)
  return c.json({ status_code: 50001, data: null, message: 'internal error' }, 500)
})

app.notFound((c) =>
  c.json({ status_code: 40401, data: null, message: 'not found' }, 404),
)

export default app
