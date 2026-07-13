import { http, HttpResponse, delay } from 'msw'

import {
  SECRET_MASKED,
  WEBHOOK_LOGS,
} from '../fixtures/webhook-settings'

/**
 * Webhook 设置页 mock handlers
 *
 * Endpoints:
 *  - GET  /api/settings/webhooks/recent          → { list, secret_masked }
 *  - POST /api/settings/webhooks/rotate-secret   → { secret, rotated_at }
 */
export const webhookSettingsHandlers = [
  http.get('/api/settings/webhooks/recent', async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const rawLimit = Number(url.searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20
    return HttpResponse.json({
      status_code: 0,
      data: {
        list: WEBHOOK_LOGS.slice(0, limit),
        secret_masked: SECRET_MASKED,
      },
    })
  }),

  http.post('/api/settings/webhooks/rotate-secret', async () => {
    await delay(400)
    return HttpResponse.json({
      status_code: 0,
      data: {
        secret: 'wh_new_secret_9f7e2a1b3c4d5e6f7g8h',
        rotated_at: '2026-07-13T10:30:00Z',
      },
    })
  }),
]
