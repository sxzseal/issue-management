import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { humanError, request } from '@/lib/request'
import type { ApiToken, CreatedApiToken } from '@/lib/api-types'

/**
 * Mint a new API token. The server returns the raw `token` ONCE — the caller
 * is responsible for surfacing it in a one-shot modal (see
 * `views/dialogs/create-token.modal.tsx`).
 */
export function useCreateApiTokenMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      request<CreatedApiToken>('/api/settings/api-tokens', {
        method: 'POST',
        body: { name },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['api-tokens'] })
    },
    onError: (e) => {
      toast.error(humanError(e, 'Token 生成失败'))
    },
  })
}

/**
 * Soft-revoke a token. The row stays visible in the list with `revoked_at`
 * populated so the user can audit past usage.
 */
export function useRevokeApiTokenMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      request<ApiToken>(
        `/api/settings/api-tokens/${encodeURIComponent(id)}/revoke`,
        {
          method: 'POST',
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['api-tokens'] })
      toast.success('Token 已撤销')
    },
    onError: (e) => {
      toast.error(humanError(e, 'Token 撤销失败'))
    },
  })
}
