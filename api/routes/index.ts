/**
 * Central router for `/api/*` endpoints — mounts all feature routers.
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import authRoutes from './auth'
import projectRoutes from './projects'
import labelRoutes from './labels'
import issueRoutes from './issues'
import commentRoutes from './comments'
import apiTokenRoutes from './api-tokens'

export function mountApiRoutes(): Hono<{ Bindings: Env }> {
  const api = new Hono<{ Bindings: Env }>()

  api.get('/ping', (c) =>
    c.json({ status_code: 0, data: { pong: true, ts: new Date().toISOString() } }),
  )
  api.get('/health', (c) =>
    c.json({ status_code: 0, data: { ok: true, ts: new Date().toISOString() } }),
  )

  api.route('/auth', authRoutes)
  api.route('/projects', projectRoutes)
  api.route('/labels', labelRoutes)
  api.route('/issues', issueRoutes)
  api.route('/', commentRoutes)
  api.route('/settings/api-tokens', apiTokenRoutes)

  return api
}
