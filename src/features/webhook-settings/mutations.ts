import { useMutation, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/request'
import { toast } from 'sonner'
import type { RotateSecretResponse } from './types'

/**
 * Rotate the webhook shared secret.
 * Server returns the NEW secret ONCE (AC-073). Cache invalidation follows so
 * `secret_masked` on the recent query refreshes to reflect the new tail.
 *
 * The UI is responsible for the danger-confirm dialog (AC-073). The mutation
 * itself is unguarded — safe because the endpoint requires auth and the UI
 * gates it.
 */
export function useRotateWebhookSecretMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => request<RotateSecretResponse>('/api/settings/webhooks/rotate-secret', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['webhook-settings'] })
      toast.success('Secret 已轮换')
    },
    onError: () => toast.error('Secret 轮换失败'),
  })
}
