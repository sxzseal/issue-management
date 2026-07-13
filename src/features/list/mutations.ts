import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request } from '@/lib/request'

export function useDeleteIssueMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<null>(`/api/issues/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
      void qc.invalidateQueries({ queryKey: ['board'] })
      toast.success('已删除 issue')
    },
    onError: () => toast.error('删除失败'),
  })
}
