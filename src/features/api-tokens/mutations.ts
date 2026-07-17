import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { humanError, request } from '@/lib/request'
import type { CreatedApiToken } from '@/lib/api-types'

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
 * Hard-delete a token. The row is removed from the database entirely; the
 * token can no longer authenticate (auth-guard filters by row existence).
 */
export function useDeleteApiTokenMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      request<{ id: string; deleted: true }>(
        `/api/settings/api-tokens/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['api-tokens'] })
      toast.success('Token 已删除')
    },
    onError: (e) => {
      toast.error(humanError(e, 'Token 删除失败'))
    },
  })
}
