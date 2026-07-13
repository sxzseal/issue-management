import type { WebhookLog } from '@/lib/api-types'

export interface WebhookRecentData {
  list: WebhookLog[]
  secret_masked: string
}

export interface RotateSecretResponse {
  secret: string
  rotated_at: string
}
