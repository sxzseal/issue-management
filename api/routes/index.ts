/**
 * Central router for `/api/*` endpoints.
 *
 * Feature routers are mounted here as they land in follow-up tasks (T008 auth,
 * T009 projects/labels, T010 issues, T011 comments, T012 webhook). For now
 * this router only exposes `/ping` and `/health` — both public — so wiring is
 * testable end-to-end without any feature route present.
 */
import { Hono } from 'hono'
import type { Env } from '../index'

export function mountApiRoutes(): Hono<{ Bindings: Env }> {
  const api = new Hono<{ Bindings: Env }>()

  api.get('/ping', (c) =>
    c.json({ status_code: 0, data: { pong: true, ts: new Date().toISOString() } }),
  )
  api.get('/health', (c) =>
    c.json({ status_code: 0, data: { ok: true, ts: new Date().toISOString() } }),
  )

  // TODO(T008-T012): mount feature routers as they arrive:
  //   api.route('/auth', authRoutes)
  //   api.route('/projects', projectRoutes)
  //   api.route('/labels', labelRoutes)
  //   api.route('/issues', issueRoutes)
  //   api.route('/comments', commentRoutes)
  //   api.route('/webhooks', webhookRoutes)
  //   api.route('/settings/webhooks', webhookSettingsRoutes)

  return api
}
