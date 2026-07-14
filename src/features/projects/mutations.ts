import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request, humanError } from '@/lib/request'
import type { Project } from '@/lib/api-types'
import type {
  CreateProjectBody,
  UpdateProjectBody,
  DeleteProjectQuery,
} from '@/lib/validators/project'
import { PROJECTS_QUERY_KEY } from './queries'

export function useCreateProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProjectBody) =>
      request<Project>('/api/projects', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      toast.success('项目已创建')
    },
    onError: (e) => toast.error(humanError(e, '项目创建失败')),
  })
}

export function useUpdateProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProjectBody }) =>
      request<Project>(`/api/projects/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      // Project name/color appears on issue rows in list/board/detail — refresh
      // them so a rename/recolor is visible without a manual refetch.
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
      void qc.invalidateQueries({ queryKey: ['board'] })
      void qc.invalidateQueries({ queryKey: ['issue-detail'] })
      toast.success('项目已更新')
    },
    onError: (e) => toast.error(humanError(e, '项目更新失败')),
  })
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      cascade,
    }: {
      id: string
      cascade: DeleteProjectQuery['cascade']
    }) =>
      request<void>(`/api/projects/${id}`, {
        method: 'DELETE',
        query: { cascade },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      // Cascade=reassign reparents issues to Inbox; either way list/board/detail
      // caches referencing the deleted project must refresh.
      void qc.invalidateQueries({ queryKey: ['issue-list'] })
      void qc.invalidateQueries({ queryKey: ['board'] })
      void qc.invalidateQueries({ queryKey: ['issue-detail'] })
      toast.success('项目已删除')
    },
    onError: (e) => toast.error(humanError(e, '项目删除失败')),
  })
}
