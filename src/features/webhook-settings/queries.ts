import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { WebhookRecentData } from './types'

export const webhookSettingsQueries = {
  recent: (limit = 20) =>
    queryOptions({
      queryKey: ['webhook-settings', 'recent', limit] as const,
      queryFn: () => request<WebhookRecentData>('/api/settings/webhooks/recent', { query: { limit } }),
      staleTime: 15_000,
    }),
}
