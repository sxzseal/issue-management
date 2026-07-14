import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request, humanError } from '@/lib/request'
import type { Label } from '@/lib/api-types'
import type { CreateLabelBody, UpdateLabelBody } from '@/lib/validators/label'
import { LABELS_QUERY_KEY } from './queries'

export function useCreateLabelMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateLabelBody) =>
      request<Label>('/api/labels', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LABELS_QUERY_KEY })
      toast.success('标签已创建')
    },
    onError: (e) => toast.error(humanError(e, '标签创建失败')),
  })
}

export function useUpdateLabelMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLabelBody }) =>
      request<Label>(`/api/labels/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LABELS_QUERY_KEY })
      // Labels appear inside issues; refresh downstream lists too.
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
      void qc.invalidateQueries({ queryKey: ['board'] })
      void qc.invalidateQueries({ queryKey: ['issue-detail'] })
      toast.success('标签已更新')
    },
    onError: (e) => toast.error(humanError(e, '标签更新失败')),
  })
}

export function useDeleteLabelMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      request<void>(`/api/labels/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LABELS_QUERY_KEY })
      // FK ON DELETE CASCADE removes issue_labels rows; refresh downstream.
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
      void qc.invalidateQueries({ queryKey: ['board'] })
      void qc.invalidateQueries({ queryKey: ['issue-detail'] })
      toast.success('标签已删除')
    },
    onError: (e) => toast.error(humanError(e, '标签删除失败')),
  })
}
